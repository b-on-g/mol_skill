namespace $.$$ {
	$mol_style_define($bog_mol_invoicer, {
		Source_section: {
			padding: $mol_gap.block,
		},
		Source_text: {
			flex: {
				grow: 0,
				shrink: 0,
				basis: 'auto',
			},
			minHeight: 'auto',
			maxHeight: '200px',
			overflow: 'auto',
			Edit: {
				position: 'sticky',
				top: 0,
				height: '100%',
				maxHeight: '200px',
			},
		},
		Source_upload: {
			position: 'relative',
			overflow: 'hidden',
			Native: {
				top: 0,
				height: '100%',
			},
		},
		Requisites_section: {
			padding: $mol_gap.block,
		},
		Requisites_header: {
			justifyContent: 'space-between',
			alignItems: 'center',
		},
		Requisites_title: {
			font: {
				weight: 'bold',
			},
		},
		Parse_row: {
			alignItems: 'center',
			gap: $mol_gap.space,
		},
		Parse_loader: {
			display: 'flex',
			alignItems: 'center',
		},
		Parse_loader_icon: {
			animation: {
				name: 'bog_mol_invoicer_spin',
				duration: '1s',
				timingFunction: 'linear',
				iterationCount: 'infinite',
			},
		},
		Signature_section: {
			padding: $mol_gap.block,
		},
		Settings_panel: {
			padding: $mol_gap.block,
			minWidth: '300px',
		},
		Settings_title: {
			font: {
				weight: 'bold',
			},
		},
		Settings_hint: {
			color: $mol_theme.shade,
			font: {
				size: '0.9rem',
			},
		},
		Templates_section: {
			padding: $mol_gap.block,
		},
		Templates_title: {
			font: {
				weight: 'bold',
			},
		},
		Templates_upload: {
			position: 'relative',
			overflow: 'hidden',
			Native: {
				top: 0,
				height: '100%',
			},
		},
		Template_row: {
			justifyContent: 'space-between',
			alignItems: 'center',
		},
		Template_name: {
			flex: {
				grow: 1,
				shrink: 1,
				basis: 'auto',
			},
		},
	})
}
