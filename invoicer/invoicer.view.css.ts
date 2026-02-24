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
		Signature_section: {
			padding: $mol_gap.block,
		},
	})
}
