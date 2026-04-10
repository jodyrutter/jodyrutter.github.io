const manifestUrl = "../assets/photography/data/manifest.json";
const initialBatch = 60;

const albumStats = document.querySelector("#album-stats");
const albumFilters = document.querySelector("#album-filters");
const galleryTitle = document.querySelector("#gallery-title");
const gallerySummary = document.querySelector("#gallery-summary");
const photoGrid = document.querySelector("#photo-grid");
const loadMoreButton = document.querySelector("#load-more");
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxTitle = document.querySelector("#lightbox-title");
const lightboxDetails = document.querySelector("#lightbox-details");
const closeLightbox = document.querySelector("#close-lightbox");

let manifest;
let selectedAlbum = "all";
let visibleCount = initialBatch;

const formatAlbumName = (name) => {
  if (name === "root") {
    return "Root Collection";
  }

  return name.replace(/[-_]/g, " ");
};

const getFilteredPhotos = () => {
  if (!manifest) {
    return [];
  }

  if (selectedAlbum === "all") {
    return manifest.photos;
  }

  return manifest.photos.filter((photo) => photo.album === selectedAlbum);
};

const renderStats = () => {
  if (!manifest) {
    return;
  }

  const topAlbums = [...manifest.albums].sort((a, b) => b.count - a.count).slice(0, 1);
  const largest = topAlbums[0];

  albumStats.innerHTML = `
    <article class="album-stat">
      <strong>${manifest.total.toLocaleString()}</strong>
      <span>Total resized photos in the web gallery</span>
    </article>
    <article class="album-stat">
      <strong>${manifest.albums.length.toLocaleString()}</strong>
      <span>Top-level albums available to browse</span>
    </article>
    <article class="album-stat">
      <strong>${largest ? formatAlbumName(largest.name) : "N/A"}</strong>
      <span>${largest ? `${largest.count.toLocaleString()} photos in the largest album` : "Album data unavailable"}</span>
    </article>
  `;
};

const renderAlbumFilters = () => {
  if (!manifest) {
    return;
  }

  const buttons = [
    { name: "all", count: manifest.total },
    ...manifest.albums
  ]
    .map((album) => {
      const label = album.name === "all" ? "All Photos" : formatAlbumName(album.name);
      const active = album.name === selectedAlbum ? "is-active" : "";

      return `
        <button class="album-filter ${active}" type="button" data-album="${album.name}">
          ${label} · ${album.count.toLocaleString()}
        </button>
      `;
    })
    .join("");

  albumFilters.innerHTML = buttons;

  albumFilters.querySelectorAll("[data-album]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedAlbum = button.dataset.album;
      visibleCount = initialBatch;
      renderAlbumFilters();
      renderGallery();
    });
  });
};

const openLightbox = (photo) => {
  lightboxImage.src = photo.display;
  lightboxImage.alt = photo.name;
  lightboxTitle.textContent = photo.name;
  lightboxDetails.textContent = `${formatAlbumName(photo.album)} · ${photo.width}×${photo.height}`;
  lightbox.showModal();
};

const renderGallery = () => {
  const filtered = getFilteredPhotos();
  const visible = filtered.slice(0, visibleCount);
  const activeLabel = selectedAlbum === "all" ? "All Photos" : formatAlbumName(selectedAlbum);

  galleryTitle.textContent = activeLabel;
  gallerySummary.textContent = `${filtered.length.toLocaleString()} photos available. Showing ${visible.length.toLocaleString()} right now.`;

  photoGrid.innerHTML = visible
    .map(
      (photo, index) => `
        <article class="photo-card reveal is-visible">
          <button type="button" data-photo-index="${index}">
            <img loading="lazy" src="${photo.thumb}" alt="${photo.name}" />
          </button>
          <div class="photo-card-meta">
            <h3>${photo.name}</h3>
            <p>${formatAlbumName(photo.album)}</p>
          </div>
        </article>
      `
    )
    .join("");

  photoGrid.querySelectorAll("[data-photo-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const photo = visible[Number(button.dataset.photoIndex)];
      openLightbox(photo);
    });
  });

  loadMoreButton.hidden = visible.length >= filtered.length;
};

loadMoreButton.addEventListener("click", () => {
  visibleCount += initialBatch;
  renderGallery();
});

closeLightbox.addEventListener("click", () => {
  lightbox.close();
});

lightbox.addEventListener("click", (event) => {
  const rect = lightbox.getBoundingClientRect();
  const inside =
    rect.top <= event.clientY &&
    event.clientY <= rect.top + rect.height &&
    rect.left <= event.clientX &&
    event.clientX <= rect.left + rect.width;

  if (!inside) {
    lightbox.close();
  }
});

try {
  const response = await fetch(manifestUrl);
  manifest = await response.json();
  renderStats();
  renderAlbumFilters();
  renderGallery();
} catch (_error) {
  galleryTitle.textContent = "Gallery unavailable";
  gallerySummary.textContent = "The photography manifest has not been generated yet.";
  loadMoreButton.hidden = true;
}
