
export const defaultConfig = {
    language: 'pt_BR',
    language_url: `/notas/assets/tinymce/langs/pt_BR.js`,
    elementpath: false,
    menubar: 'edit table',
    plugins: "advlist lists charmap table paste",
    toolbar: 'undo redo | styles |  \
              bold italic underline | \
              bullist numlist |',
    content_style: 'body { font-size: 10.5pt; }',
    style_formats: [
      {
        title: 'Headers', items: [
          { title: 'h4', block: 'h4' },
          { title: 'h5', block: 'h5' },
          { title: 'h6', block: 'h6' }
        ]
      },
      {
        title: 'Inline', items: [
          { title: 'Bold', inline: 'b', icon: 'bold' },
          { title: 'Italic', inline: 'i', icon: 'italic' },
          { title: 'Underline', inline: 'span', styles: { textDecoration: 'underline' }, icon: 'underline' },
        ]
      },
      {
        title: 'Blocks', items: [
          { title: 'Paragraph', block: 'p' },
          { title: 'Blockquote', block: 'blockquote' },
          { title: 'Div', block: 'div' },
          { title: 'Pre', block: 'pre' }
        ]
      },
      {
        title: 'Alignment', items: [
          { title: 'Left', block: 'div', styles: { textAlign: 'left' }},
          { title: 'Center', block: 'div', styles: { textAlign: 'center' }},
          { title: 'Right', block: 'div', styles: { textAlign: 'right' }},
          { title: 'Justify', block: 'div', styles: { textAlign: 'justify' }}
        ]
      },
      { title: 'Referência', block: 'p', styles: { textAlign: 'right', fontSize: '8pt' }, selector: 'p,h1,h2,h3,h4,h5,h6,div', classes: 'referencia' }],
    image_title: true,
    automatic_uploads: true,
    file_picker_types: "image",
    target_list: [
      {title: 'Nova aba', value: '_blank'}
  ],
    default_link_target: "_blank",
    browser_spellcheck: true,
};