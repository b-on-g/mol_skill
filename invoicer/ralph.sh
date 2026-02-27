#!/bin/bash
set -e

TASKS_FILE="tasks.json"
PROMPT_FILE="prompt.md"
MAX_RETRIES=2           # Максимум попыток на одну задачу
COOLDOWN=14400          # 4 часа в секундах — пауза при rate limit
ATTEMPTS_FILE=$(mktemp -t ralph_attempts.XXXXXX)
trap "rm -f $ATTEMPTS_FILE" EXIT

# Agent selection:
# - Set RALPH_AGENT=claude or RALPH_AGENT=codex to force.
# - Otherwise auto-detect (prefers Claude if available).
resolve_agent() {
    if [[ -n "${RALPH_AGENT:-}" ]]; then
        echo "$RALPH_AGENT"
        return 0
    fi
    if command -v claude >/dev/null 2>&1; then
        echo "claude"
        return 0
    fi
    if command -v codex >/dev/null 2>&1; then
        echo "codex"
        return 0
    fi
    return 1
}

run_agent() {
    local agent="$1"
    local prompt="$2"

    case "$agent" in
        claude)
            claude --permission-mode acceptEdits -p "$prompt"
            ;;
        codex)
            local output_file
            output_file="$(mktemp -t ralph_codex.XXXXXX)"
            codex exec --full-auto --color never -C "$PWD" --output-last-message "$output_file" "$prompt" >/dev/null
            cat "$output_file"
            rm -f "$output_file"
            ;;
        *)
            echo "Unsupported agent: $agent" >&2
            return 1
            ;;
    esac
}

# Функция проверки наличия pending задач
has_pending_tasks() {
    pending_count=$(grep -c '"status": "pending"' "$TASKS_FILE" 2>/dev/null) || pending_count=0
    [ "$pending_count" -gt 0 ]
}

# Получить количество попыток для задачи
get_attempts() {
    local task_id="$1"
    local count
    count=$(grep -c "^${task_id}$" "$ATTEMPTS_FILE" 2>/dev/null) || count=0
    echo "$count"
}

# Записать попытку
add_attempt() {
    local task_id="$1"
    echo "$task_id" >> "$ATTEMPTS_FILE"
}

# Получить ID следующей pending задачи по приоритету, пропуская задачи из skip-списка
get_next_task_id() {
    local skip_list="$1"  # через запятую: "INV-001,INV-002"
    python3 -c "
import json
skip = set('${skip_list}'.split(',')) if '${skip_list}' else set()
with open('$TASKS_FILE') as f:
    data = json.load(f)
priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
pending = [t for t in data['tasks'] if t['status'] == 'pending' and t['id'] not in skip]
pending.sort(key=lambda t: priority_order.get(t.get('priority','low'), 4))
if pending:
    print(pending[0]['id'])
" 2>/dev/null || echo ""
}

get_task_info() {
    local task_id="$1"
    python3 -c "
import json
with open('$TASKS_FILE') as f:
    data = json.load(f)
for t in data['tasks']:
    if t['id'] == '${task_id}':
        print(f\"{t['id']}: {t['description']}\")
        break
" 2>/dev/null || echo "$task_id"
}

build_prompt() {
    local task_id="$1"
    sed "s/__TASK_ID__/${task_id}/g" "$PROMPT_FILE"
}

iteration=1
skipped_tasks=""          # задачи, исчерпавшие лимит попыток
completed_tasks=""        # список завершённых задач (по строке)
completed_count=0
failed_tasks=""           # список задач, которые не удалось завершить
failed_count=0

while has_pending_tasks; do
    # Получаем следующую задачу, пропуская уже исчерпавшие лимит
    next_id=$(get_next_task_id "$skipped_tasks")

    # Если нет задач (все оставшиеся в skip-списке) — выходим
    if [[ -z "$next_id" ]]; then
        break
    fi

    # Считаем попытки
    add_attempt "$next_id"
    attempts=$(get_attempts "$next_id")

    next_info=$(get_task_info "$next_id")

    # Тихий лог (одна строка на итерацию)
    echo "[$iteration] $next_info (попытка $attempts/$MAX_RETRIES)"

    agent=$(resolve_agent) || {
        echo "Не найден поддерживаемый агент. Установите 'claude' или 'codex', либо задайте RALPH_AGENT." >&2
        exit 1
    }

    prompt=$(build_prompt "$next_id")

    # Запуск агента с обработкой rate limit
    result=""
    if ! result=$(run_agent "$agent" "$prompt" 2>&1); then
        # Агент упал — проверяем rate limit
        if echo "$result" | grep -qi "rate\|limit\|usage\|capacity\|throttl\|429\|too many"; then
            echo "  -> Rate limit! Жду ${COOLDOWN}с (4 часа) перед повторной попыткой..."
            echo "  -> Пауза до: $(date -v+${COOLDOWN}S '+%H:%M:%S' 2>/dev/null || date -d "+${COOLDOWN} seconds" '+%H:%M:%S' 2>/dev/null || echo '~4ч')"
            sleep "$COOLDOWN"
            echo "  -> Пауза окончена, продолжаю задачу $next_id"
            # Не считаем эту попытку — откатываем счётчик
            # (просто повторим ту же задачу на следующей итерации без инкремента)
            ((iteration++))
            continue
        else
            echo "  -> Агент упал с ошибкой"
            echo "  -> $result" | head -5
        fi
    fi

    if [[ "$result" == *"RALPH_COMPLETE"* ]]; then
        completed_tasks="${completed_tasks}  + ${next_info}
"
        ((completed_count++))
        echo "  -> done"
    elif [[ "$result" == *"RALPH_PARTIAL"* ]]; then
        echo "  -> partial (прогресс записан)"
    else
        echo "  -> нет результата"
    fi

    # Если задача всё ещё pending и исчерпала лимит попыток — пропускаем
    still_pending=$(python3 -c "
import json
with open('$TASKS_FILE') as f:
    data = json.load(f)
for t in data['tasks']:
    if t['id'] == '${next_id}' and t['status'] == 'pending':
        print('yes')
        break
" 2>/dev/null || echo "")

    if [[ "$still_pending" == "yes" && $attempts -ge $MAX_RETRIES ]]; then
        echo "  -> $next_id: исчерпаны попытки ($MAX_RETRIES), пропускаю"
        failed_tasks="${failed_tasks}  - ${next_info}
"
        ((failed_count++))
        if [[ -n "$skipped_tasks" ]]; then
            skipped_tasks="$skipped_tasks,$next_id"
        else
            skipped_tasks="$next_id"
        fi
    fi

    ((iteration++))
done

# === Финальный отчёт ===
echo ""
echo "==========================================="
echo "  Ralph завершил работу. Итераций: $((iteration-1))"
echo "==========================================="

if [ "$completed_count" -gt 0 ]; then
    echo ""
    echo "Выполнено ($completed_count):"
    printf "%s" "$completed_tasks"
fi

if [ "$failed_count" -gt 0 ]; then
    echo ""
    echo "Не удалось завершить ($failed_count):"
    printf "%s" "$failed_tasks"
fi

remaining=$(grep -c '"status": "pending"' "$TASKS_FILE" 2>/dev/null) || remaining=0
done_total=$(grep -c '"status": "done"' "$TASKS_FILE" 2>/dev/null) || done_total=0
echo ""
echo "Итого: done=$done_total, pending=$remaining"
echo "==========================================="

if [ "$remaining" -eq 0 ]; then
    say -v Milena "Хозяин, я всё сделалъ!"
else
    say -v Milena "Хозяин, я закончилъ. Выполнено $completed_count, не удалось $failed_count, осталось $remaining."
fi
