const dataUrl = new URL('../../data/site.json', import.meta.url);
dataUrl.searchParams.set('v', String(Date.now()));

const state = {
  data: null,
  filter: 'Recent'
};

async function loadSite() {
  const response = await fetch(dataUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Unable to load site data.');
  }

  state.data = await response.json();
  render();
  bindFilters();
}

function render() {
  const { profile, sections, publications, gallery } = state.data;

  setText('profile-name', profile.name);
  setText('profile-intro', profile.intro);

  const photo = document.getElementById('profile-photo');
  photo.src = resolveAsset(profile.photo);
  photo.alt = `${profile.name} portrait`;

  renderRichProfileTitle(profile.title);
  renderProfileEmail(profile.email);
  renderRichText('about-text', sections.about);
  renderRichText('research-text', sections.research);

  renderPublications(publications, profile.name);
  renderGallery(gallery.collections);
}

function renderPublications(publications, profileName) {
  const sortedPublications = [...publications].sort((a, b) => Number(b.year) - Number(a.year) || a.title.localeCompare(b.title));
  const featured = sortedPublications.find((item) => item.featured) || sortedPublications[0];
  const featuredRoot = document.getElementById('featured-paper');
  const listRoot = document.getElementById('publication-list');
  const template = document.getElementById('publication-template');
  const currentYear = new Date().getFullYear();
  const visiblePubs = sortedPublications.filter((item) => {
    if (state.filter === 'All') return true;
    if (state.filter === 'Recent') return Number(item.year) >= currentYear - 2;
    if (state.filter === 'Preprint') return item.type === 'Preprint';
    return item.type === state.filter;
  });

  featuredRoot.innerHTML = '';
  listRoot.innerHTML = '';

  if (featured) {
    const hero = document.createElement('article');
    hero.className = 'featured-card';
    const visual = document.createElement('img');
    visual.className = 'featured-visual';
    visual.src = resolveAsset(featured.image || 'assets/images/pub-placeholder.svg');
    visual.alt = `${featured.title} preview`;
    const copy = document.createElement('div');
    copy.className = 'featured-copy';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'Featured paper';
    const title = document.createElement('h3');
    title.textContent = featured.title;
    const authors = document.createElement('p');
    authors.innerHTML = highlightAuthorName(featured.authors, profileName);
    const venue = document.createElement('p');
    venue.className = 'venue-line';
    venue.textContent = `${featured.venue} · ${featured.year}`;
    const abstract = document.createElement('p');
    abstract.textContent = featured.abstract;
    const links = document.createElement('div');
    links.className = 'publication-links';
    appendLinks(links, featured.links);
    copy.append(eyebrow, title, authors, venue, abstract, links);
    hero.append(visual, copy);
    featuredRoot.appendChild(hero);
  }

  visiblePubs.forEach((publication) => {
    const fragment = template.content.cloneNode(true);
    const thumb = fragment.querySelector('.publication-thumb');
    thumb.src = resolveAsset(publication.image || 'assets/images/pub-placeholder.svg');
    thumb.alt = `${publication.title} preview`;
    fragment.querySelector('.publication-type').textContent = publication.type;
    fragment.querySelector('.publication-year').textContent = publication.year;
    fragment.querySelector('.publication-title').textContent = publication.title;
    fragment.querySelector('.publication-authors').innerHTML = highlightAuthorName(publication.authors, profileName);
    fragment.querySelector('.publication-venue').textContent = publication.venue;
    fragment.querySelector('.publication-abstract').textContent = publication.abstract;
    appendLinks(fragment.querySelector('.publication-links'), publication.links);
    listRoot.appendChild(fragment);
  });
}

function renderGallery(collections) {
  const root = document.getElementById('gallery-grid');
  root.innerHTML = '';

  collections.forEach((item) => {
    const article = document.createElement('article');
    article.className = 'gallery-card';
    const image = document.createElement('img');
    image.src = resolveAsset(item.cover);
    image.alt = `${item.title} cover`;
    const copy = document.createElement('div');
    const meta = document.createElement('p');
    meta.className = 'gallery-meta';
    meta.textContent = item.year;
    const title = document.createElement('h3');
    title.textContent = item.title;
    const description = document.createElement('p');
    description.textContent = item.description;
    copy.append(meta, title, description);
    article.append(image, copy);
    root.appendChild(article);
  });
}

function bindFilters() {
  document.querySelectorAll('.chip').forEach((button) => {
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      document.querySelectorAll('.chip').forEach((chip) => chip.classList.remove('active'));
      button.classList.add('active');
      renderPublications(state.data.publications);
    });
  });

  const galleryToggle = document.getElementById('gallery-toggle');
  const galleryContent = document.getElementById('gallery-content');

  galleryToggle.addEventListener('click', () => {
    const isHidden = galleryContent.classList.toggle('hidden');
    galleryToggle.setAttribute('aria-expanded', String(!isHidden));
    galleryToggle.textContent = isHidden ? 'Reveal gallery' : 'Hide gallery';
  });
}

function appendLinks(root, links = []) {
  root.innerHTML = '';
  links.forEach((link) => {
    const anchor = document.createElement('a');
    anchor.href = link.url;
    anchor.textContent = link.label;
    anchor.target = '_blank';
    anchor.rel = 'noreferrer';
    root.appendChild(anchor);
  });
}

function highlightAuthorName(authors, profileName) {
  if (!authors || !profileName) return authors || '';

  const escapedAuthors = escapeHtml(authors);
  const fullNamePattern = new RegExp(`\\b${escapeRegExp(profileName)}\\b`, 'gi');
  const lastName = profileName.trim().split(/\s+/).slice(-1)[0] || '';
  const initialPattern = new RegExp(`\\b${escapeRegExp(profileName.charAt(0))}\\.?\\s*${escapeRegExp(lastName)}\\b`, 'gi');

  return escapedAuthors
    .replace(fullNamePattern, (match) => `<span class="author-highlight">${match}</span>`)
    .replace(initialPattern, (match) => `<span class="author-highlight">${match}</span>`);
}

function renderRichProfileTitle(title) {
  const node = document.getElementById('profile-title');
  node.innerHTML = formatProfileTitle(title || '');
}

function renderProfileEmail(value) {
  const node = document.getElementById('profile-email-inline');
  node.innerHTML = formatEmailLine(value || '');
}

function renderRichText(id, value) {
  const node = document.getElementById(id);
  node.innerHTML = formatRichText(value || '');
}

function formatProfileTitle(value) {
  return escapeHtml(value)
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a class="hero-inline-link" href="$2" target="_blank" rel="noreferrer">$1</a>'
    )
    .replace(/\n/g, '<br />');
}

function formatEmailLine(value) {
  return escapeHtml(value)
    .replace(/\s*\|\s*/g, ' <span class="email-separator">/</span> ')
    .replace(/\n/g, '<br />');
}

function formatRichText(value) {
  return escapeHtml(value)
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a class="inline-content-link" href="$2" target="_blank" rel="noreferrer">$1</a>'
    )
    .replace(/\n/g, '<br />');
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveAsset(path) {
  if (!path) return '';
  return new URL(`../../${path.replace(/^\/+/, '')}`, import.meta.url).href;
}

function setText(id, value) {
  document.getElementById(id).textContent = value || '';
}

function setHref(id, value) {
  const node = document.getElementById(id);
  node.href = value || '#';
}

loadSite().catch((error) => {
  console.error(error);
  document.getElementById('profile-name').textContent = 'Unable to load site content';
});
