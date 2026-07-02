const dataUrl = new URL('../../data/site.json', import.meta.url);
dataUrl.searchParams.set('v', String(Date.now()));

let siteData;

async function init() {
  const response = await fetch(dataUrl, { cache: 'no-store' });
  siteData = await response.json();
  hydrateStaticFields();
  renderPublicationEditors();
  renderGalleryEditors();
  bindEvents();
}

function hydrateStaticFields() {
  document.querySelectorAll('[name]').forEach((field) => {
    const value = getValueByPath(siteData, field.name);
    field.value = value ?? '';
  });

  document.getElementById('photo-preview').src = resolveAsset(siteData.profile.photo);
}

function bindEvents() {
  document.getElementById('site-form').addEventListener('input', syncFormState);
  document.getElementById('download-json').addEventListener('click', downloadJson);
  document.getElementById('import-bibtex').addEventListener('click', importBibtexPublication);
  document.getElementById('add-publication').addEventListener('click', () => {
    siteData.publications.unshift(createEmptyPublication());
    renderPublicationEditors();
  });

  document.getElementById('add-collection').addEventListener('click', () => {
    siteData.gallery.collections.push({
      title: 'New collection',
      year: '',
      description: '',
      cover: 'assets/images/gallery-1.svg'
    });
    renderGalleryEditors();
  });

  document.getElementById('photo-upload').addEventListener('change', handlePhotoPreview);
}

function syncFormState() {
  document.querySelectorAll('[name]').forEach((field) => {
    setValueByPath(siteData, field.name, field.value);
  });

  syncPublicationEditors();
  syncGalleryEditors();
}

function renderPublicationEditors() {
  const root = document.getElementById('publication-editor-list');
  const template = document.getElementById('publication-editor-template');
  root.innerHTML = '';

  siteData.publications.forEach((publication, index) => {
    const fragment = template.content.cloneNode(true);
    const item = fragment.querySelector('.editor-item');
    item.dataset.index = index;
    item.querySelector('h3').textContent = publication.title || `Publication ${index + 1}`;
    setEditorField(item, 'title', publication.title);
    setEditorField(item, 'authors', publication.authors);
    setEditorField(item, 'venue', publication.venue);
    setEditorField(item, 'year', publication.year);
    setEditorField(item, 'type', publication.type);
    setEditorField(item, 'image', publication.image || 'assets/images/pub-placeholder.svg');
    setEditorField(item, 'abstract', publication.abstract);
    setEditorField(item, 'linkLabel', publication.links?.[0]?.label || 'Paper');
    setEditorField(item, 'linkUrl', publication.links?.[0]?.url || '#');
    item.querySelector('[data-field="featured"]').checked = Boolean(publication.featured);
    item.querySelector('.remove-item').addEventListener('click', () => {
      siteData.publications.splice(index, 1);
      renderPublicationEditors();
    });
    root.appendChild(fragment);
  });
}

function renderGalleryEditors() {
  const root = document.getElementById('gallery-editor-list');
  const template = document.getElementById('gallery-editor-template');
  root.innerHTML = '';

  siteData.gallery.collections.forEach((collection, index) => {
    const fragment = template.content.cloneNode(true);
    const item = fragment.querySelector('.editor-item');
    item.dataset.index = index;
    item.querySelector('h3').textContent = collection.title || `Collection ${index + 1}`;
    setEditorField(item, 'title', collection.title);
    setEditorField(item, 'year', collection.year);
    setEditorField(item, 'description', collection.description);
    setEditorField(item, 'cover', collection.cover);
    item.querySelector('.remove-item').addEventListener('click', () => {
      siteData.gallery.collections.splice(index, 1);
      renderGalleryEditors();
    });
    root.appendChild(fragment);
  });
}

function syncPublicationEditors() {
  siteData.publications = [...document.querySelectorAll('#publication-editor-list .editor-item')].map((item) => ({
    title: getEditorField(item, 'title'),
    authors: getEditorField(item, 'authors'),
    venue: getEditorField(item, 'venue'),
    year: Number(getEditorField(item, 'year')),
    type: getEditorField(item, 'type'),
    image: getEditorField(item, 'image') || 'assets/images/pub-placeholder.svg',
    abstract: getEditorField(item, 'abstract'),
    links: [
      {
        label: getEditorField(item, 'linkLabel') || 'Paper',
        url: getEditorField(item, 'linkUrl') || '#'
      }
    ],
    featured: item.querySelector('[data-field="featured"]').checked
  }));

  [...document.querySelectorAll('#publication-editor-list .editor-item h3')].forEach((heading, index) => {
    heading.textContent = siteData.publications[index].title || `Publication ${index + 1}`;
  });
}

function syncGalleryEditors() {
  siteData.gallery.collections = [...document.querySelectorAll('#gallery-editor-list .editor-item')].map((item) => ({
    title: getEditorField(item, 'title'),
    year: getEditorField(item, 'year'),
    description: getEditorField(item, 'description'),
    cover: getEditorField(item, 'cover')
  }));
}

function handlePhotoPreview(event) {
  const [file] = event.target.files;
  if (!file) return;

  const previewUrl = URL.createObjectURL(file);
  document.getElementById('photo-preview').src = previewUrl;
  document.querySelector('[name="profile.photo"]').value = `assets/images/${file.name}`;
  syncFormState();
}

function importBibtexPublication() {
  const input = document.getElementById('bibtex-input');
  const parsed = parseBibtexEntry(input.value);

  if (!parsed) {
    window.alert('Could not parse the BibTeX entry. Paste one complete entry and try again.');
    return;
  }

  siteData.publications.unshift({
    ...createEmptyPublication(),
    ...parsed
  });

  input.value = '';
  renderPublicationEditors();
}

function downloadJson() {
  syncFormState();
  const blob = new Blob([JSON.stringify(siteData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'site.json';
  anchor.click();
  URL.revokeObjectURL(url);
}

function setEditorField(root, field, value) {
  root.querySelector(`[data-field="${field}"]`).value = value ?? '';
}

function getEditorField(root, field) {
  return root.querySelector(`[data-field="${field}"]`).value;
}

function getValueByPath(object, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], object);
}

function setValueByPath(object, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((acc, key) => acc[key], object);
  target[last] = value;
}

function resolveAsset(path) {
  if (!path) return '';
  return new URL(`../${path.replace(/^\/+/, '')}`, import.meta.url).href;
}

function createEmptyPublication() {
  return {
    title: 'New publication',
    authors: '',
    venue: '',
    year: new Date().getFullYear(),
    type: 'Conference',
    image: 'assets/images/pub-placeholder.svg',
    abstract: '',
    links: [{ label: 'Paper', url: '#' }],
    featured: false
  };
}

function parseBibtexEntry(source) {
  if (!source.trim()) return null;

  const entryMatch = source.match(/@(\w+)\s*\{[\s\S]*$/);
  if (!entryMatch) return null;

  const entryType = entryMatch[1].toLowerCase();
  const fields = {};
  const fieldPattern = /(\w+)\s*=\s*(\{(?:[^{}]|\{[^{}]*\})*\}|"(?:[^"\\]|\\.)*"|[^,\n]+)\s*,?/g;
  let match;

  while ((match = fieldPattern.exec(source)) !== null) {
    fields[match[1].toLowerCase()] = cleanBibtexValue(match[2]);
  }

  const venue = fields.journal || fields.booktitle || fields.publisher || fields.school || '';
  const url = fields.url || fields.doi || '#';

  return {
    title: fields.title || 'New publication',
    authors: formatBibtexAuthors(fields.author || ''),
    venue,
    year: Number(fields.year) || new Date().getFullYear(),
    type: inferPublicationType(entryType),
    image: 'assets/images/pub-placeholder.svg',
    abstract: fields.abstract || '',
    links: [{ label: fields.url ? 'Paper' : 'Reference', url }],
    featured: false
  };
}

function cleanBibtexValue(value) {
  const trimmed = value.trim().replace(/,$/, '');
  const unwrapped =
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
      ? trimmed.slice(1, -1)
      : trimmed;

  return unwrapped.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
}

function formatBibtexAuthors(authorField) {
  return authorField
    .split(/\sand\s/i)
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => {
      if (!name.includes(',')) return name;
      const [last, first] = name.split(',').map((part) => part.trim());
      return `${first} ${last}`.trim();
    })
    .join(', ');
}

function inferPublicationType(entryType) {
  if (entryType === 'article') return 'Journal';
  if (entryType === 'inproceedings' || entryType === 'conference' || entryType === 'proceedings') return 'Conference';
  if (entryType === 'misc' || entryType === 'unpublished' || entryType === 'techreport') return 'Preprint';
  return 'Conference';
}

init().catch((error) => {
  console.error(error);
});
