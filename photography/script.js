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
const panoramaStage = document.querySelector("#panorama-stage");
const panoramaImage = document.querySelector("#panorama-image");
const lightboxTitle = document.querySelector("#lightbox-title");
const lightboxDetails = document.querySelector("#lightbox-details");
const closeLightbox = document.querySelector("#close-lightbox");

let manifest;
let selectedAlbum = "all";
let visibleCount = initialBatch;
let panoramaState = null;

const formatAlbumName = (name) => {
  if (name === "root") {
    return "Root Collection";
  }

  return name.replace(/[-_]/g, " ");
};

const isPanorama = (photo) => photo.width / Math.max(photo.height, 1) >= 2.2;

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
  const panoramaCount = manifest.photos.filter((photo) => isPanorama(photo)).length;

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
      <strong>${panoramaCount.toLocaleString()}</strong>
      <span>Stitched panoramas with drag view support</span>
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

  const buttons = [{ name: "all", count: manifest.total }, ...manifest.albums]
    .map((album) => {
      const label = album.name === "all" ? "All Photos" : formatAlbumName(album.name);
      const active = album.name === selectedAlbum ? "is-active" : "";

      return `
        <button class="album-filter ${active}" type="button" data-album="${album.name}">
          ${label} - ${album.count.toLocaleString()}
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

const updatePanoramaTransform = () => {
  if (!panoramaState) {
    return;
  }

  const { panX, panY, scale } = panoramaState;
  panoramaImage.style.transform = `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${scale})`;
};

const resetPanoramaState = () => {
  panoramaState = null;
  panoramaStage.hidden = true;
  panoramaStage.classList.remove("is-dragging");
  panoramaImage.onload = null;
  panoramaImage.removeAttribute("src");
  panoramaImage.removeAttribute("alt");
  panoramaImage.style.height = "";
  panoramaImage.style.transform = "";
};

const openPanorama = (photo) => {
  lightboxImage.hidden = true;
  panoramaStage.hidden = false;
  panoramaImage.src = photo.display;
  panoramaImage.alt = photo.name;
  panoramaState = {
    scale: 1,
    minScale: 1,
    maxScale: 3,
    panX: 0,
    panY: 0,
    activePointerId: null,
    startX: 0,
    startY: 0,
    originPanX: 0,
    originPanY: 0
  };

  const setInitialHeight = () => {
    panoramaImage.style.height = `${panoramaStage.clientHeight}px`;
    updatePanoramaTransform();
  };

  if (panoramaImage.complete) {
    setInitialHeight();
  } else {
    panoramaImage.onload = setInitialHeight;
  }
};

const openLightbox = (photo) => {
  lightboxTitle.textContent = photo.name;
  lightboxDetails.textContent = `${formatAlbumName(photo.album)} - ${photo.width}x${photo.height}`;

  if (isPanorama(photo)) {
    openPanorama(photo);
  } else {
    resetPanoramaState();
    lightboxImage.hidden = false;
    lightboxImage.src = photo.display;
    lightboxImage.alt = photo.name;
  }

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
        <article class="photo-card reveal is-visible ${isPanorama(photo) ? "is-panorama" : ""}">
          <button type="button" data-photo-index="${index}">
            <img loading="lazy" src="${photo.thumb}" alt="${photo.name}" />
          </button>
          <div class="photo-card-meta">
            <h3>${photo.name}</h3>
            <p>${formatAlbumName(photo.album)}${isPanorama(photo) ? " - Panorama View" : ""}</p>
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

lightbox.addEventListener("close", () => {
  resetPanoramaState();
  lightboxImage.removeAttribute("src");
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

panoramaStage.addEventListener("pointerdown", (event) => {
  if (!panoramaState) {
    return;
  }

  panoramaState.activePointerId = event.pointerId;
  panoramaState.startX = event.clientX;
  panoramaState.startY = event.clientY;
  panoramaState.originPanX = panoramaState.panX;
  panoramaState.originPanY = panoramaState.panY;
  panoramaStage.classList.add("is-dragging");
  panoramaStage.setPointerCapture(event.pointerId);
});

panoramaStage.addEventListener("pointermove", (event) => {
  if (!panoramaState || panoramaState.activePointerId !== event.pointerId) {
    return;
  }

  panoramaState.panX = panoramaState.originPanX + (event.clientX - panoramaState.startX);
  panoramaState.panY = panoramaState.originPanY + (event.clientY - panoramaState.startY);
  updatePanoramaTransform();
});

const stopPanoramaDrag = (event) => {
  if (!panoramaState || panoramaState.activePointerId !== event.pointerId) {
    return;
  }

  panoramaState.activePointerId = null;
  panoramaStage.classList.remove("is-dragging");

  if (panoramaStage.hasPointerCapture(event.pointerId)) {
    panoramaStage.releasePointerCapture(event.pointerId);
  }
};

panoramaStage.addEventListener("pointerup", stopPanoramaDrag);
panoramaStage.addEventListener("pointercancel", stopPanoramaDrag);

panoramaStage.addEventListener("wheel", (event) => {
  if (!panoramaState) {
    return;
  }

  event.preventDefault();
  const nextScale = panoramaState.scale * (event.deltaY < 0 ? 1.12 : 0.9);
  panoramaState.scale = Math.min(panoramaState.maxScale, Math.max(panoramaState.minScale, nextScale));
  updatePanoramaTransform();
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
