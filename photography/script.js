const manifestUrl = "../assets/photography/data/manifest.json";
const initialBatch = 60;

const albumStats = document.querySelector("#album-stats");
const albumHelper = document.querySelector("#album-helper");
const qualityToggle = document.querySelector("#quality-toggle");
const qualityNote = document.querySelector("#quality-note");
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
let panoramaOnly = false;
let highQualityOnly = true;

const formatAlbumName = (name) => {
  if (name === "root") {
    return "Root Collection";
  }

  return name.replace(/[-_]/g, " ");
};

const isPanorama = (photo) => photo.width / Math.max(photo.height, 1) >= 2.2;
const passesQuality = (photo) => !highQualityOnly || photo.isHighQuality;

const getVisiblePool = () => {
  if (!manifest) {
    return [];
  }

  return manifest.photos.filter((photo) => passesQuality(photo) && (!panoramaOnly || isPanorama(photo)));
};

const comparePhotos = (left, right) => {
  const leftLocation = left.locationLabel || left.album;
  const rightLocation = right.locationLabel || right.album;
  const locationDiff = leftLocation.localeCompare(rightLocation);
  if (locationDiff !== 0) {
    return locationDiff;
  }

  const leftDate = left.dateLabel || left.yearMonth || "";
  const rightDate = right.dateLabel || right.yearMonth || "";
  const dateDiff = rightDate.localeCompare(leftDate);
  if (dateDiff !== 0) {
    return dateDiff;
  }

  return left.name.localeCompare(right.name);
};

const getFilteredPhotos = () => {
  if (!manifest) {
    return [];
  }

  const visiblePool = getVisiblePool();

  if (selectedAlbum === "all") {
    return visiblePool.sort(comparePhotos);
  }

  return visiblePool.filter((photo) => photo.album === selectedAlbum).sort(comparePhotos);
};

const renderStats = () => {
  if (!manifest) {
    return;
  }

  const panoramaCount = manifest.photos.filter((photo) => isPanorama(photo)).length;
  const highQualityCount = manifest.photos.filter((photo) => photo.isHighQuality).length;
  const archivedCount = manifest.total - highQualityCount;

  albumStats.innerHTML = `
    <article class="album-stat">
      <strong>${manifest.total.toLocaleString()}</strong>
      <span>Unique photos in the gallery after cleanup</span>
    </article>
    <article class="album-stat">
      <strong>${manifest.duplicatesRemoved.toLocaleString()}</strong>
      <span>Exact duplicates removed from the web gallery build</span>
    </article>
    <article class="album-stat">
      <strong>${highQualityCount.toLocaleString()}</strong>
      <span>Photos currently considered high quality</span>
    </article>
    <article class="album-stat">
      <strong>${archivedCount.toLocaleString()}</strong>
      <span>Archive shots hidden when high quality mode is on</span>
    </article>
    <article class="album-stat">
      <strong>${panoramaCount.toLocaleString()}</strong>
      <span>Stitched panoramas with drag view support</span>
    </article>
    <article class="album-stat">
      <strong>${manifest.albums.length.toLocaleString()}</strong>
      <span>Location groups available to browse</span>
    </article>
  `;

  albumHelper.textContent = `The live gallery is organized into ${manifest.albums.length.toLocaleString()} location filters. Inside each location, photos are labeled by year and month, with exact dates shown in the larger view when available.`;
  qualityNote.textContent = highQualityOnly
    ? `${archivedCount.toLocaleString()} softer, flatter, or weaker archive shots are currently hidden. Turn the switch off to browse the full library.`
    : `High quality mode is off, so you are seeing the full archive, including shots that were kept for completeness but are less polished.`;
};

const renderAlbumFilters = () => {
  if (!manifest) {
    return;
  }

  const visiblePool = getVisiblePool();
  const albumCounts = visiblePool.reduce((counts, photo) => {
    counts.set(photo.album, (counts.get(photo.album) || 0) + 1);
    return counts;
  }, new Map());

  const buttons = [{ name: "all", count: visiblePool.length }, ...manifest.albums]
    .map((album) => {
      const label = album.name === "all" ? "All Locations" : formatAlbumName(album.name);
      const count = album.name === "all" ? visiblePool.length : albumCounts.get(album.name) || 0;
      const active = album.name === selectedAlbum ? "is-active" : "";

      return `
        <button class="album-filter ${active}" type="button" data-album="${album.name}" ${count === 0 ? "disabled" : ""}>
          ${label} - ${count.toLocaleString()}
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

  const panoramaButton = document.createElement("button");
  panoramaButton.type = "button";
  panoramaButton.className = `album-filter ${panoramaOnly ? "is-active" : ""}`;
  panoramaButton.textContent = `Panoramas Only - ${visiblePool.filter((photo) => isPanorama(photo)).length.toLocaleString()}`;
  panoramaButton.addEventListener("click", () => {
    panoramaOnly = !panoramaOnly;
    visibleCount = initialBatch;
    renderAlbumFilters();
    renderGallery();
  });
  albumFilters.appendChild(panoramaButton);
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
  lightboxDetails.textContent = `${formatAlbumName(photo.locationLabel || photo.album)} - ${photo.dateLabel || photo.yearMonth} - ${photo.width}x${photo.height}`;

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
  const activeLabel = selectedAlbum === "all" ? "All Locations" : formatAlbumName(selectedAlbum);
  const hiddenByQuality = manifest.photos.length - manifest.photos.filter((photo) => photo.isHighQuality).length;

  galleryTitle.textContent = panoramaOnly ? `${activeLabel} - Panoramas` : activeLabel;
  gallerySummary.textContent =
    selectedAlbum === "all"
      ? `${filtered.length.toLocaleString()} photos available across all location groups. Showing ${visible.length.toLocaleString()} right now, sorted by location and then newest date first.${highQualityOnly ? ` ${hiddenByQuality.toLocaleString()} archive shots are hidden by the quality switch.` : ""}`
      : `${filtered.length.toLocaleString()} photos available in ${activeLabel}. Showing ${visible.length.toLocaleString()} right now, newest date first.${highQualityOnly ? " High quality mode is on." : ""}`;

  if (!visible.length) {
    photoGrid.innerHTML = `
      <article class="empty-state panel reveal is-visible">
        <h3>No photos match this filter yet</h3>
        <p>Try another location, turn off panoramas only, or disable the high quality switch to browse the full archive.</p>
      </article>
    `;
    loadMoreButton.hidden = true;
    return;
  }

  photoGrid.innerHTML = visible
    .map(
      (photo, index) => `
        <article class="photo-card reveal is-visible ${isPanorama(photo) ? "is-panorama" : ""}">
          ${isPanorama(photo) ? '<div class="photo-badge">Panorama</div>' : ""}
          <button type="button" data-photo-index="${index}">
            <img loading="lazy" src="${photo.thumb}" alt="${photo.name}" />
          </button>
          <div class="photo-card-meta">
            <h3>${photo.name}</h3>
            <p>${formatAlbumName(photo.locationLabel || photo.album)} - ${photo.yearMonth}${isPanorama(photo) ? " - Panorama View" : ""}</p>
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

qualityToggle.addEventListener("change", () => {
  highQualityOnly = qualityToggle.checked;
  visibleCount = initialBatch;
  renderStats();
  renderAlbumFilters();
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
