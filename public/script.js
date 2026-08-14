document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('dropZone');
  const imageInput = document.getElementById('imageInput');
  const uploadPrompt = document.getElementById('uploadPrompt');
  const previewContainer = document.getElementById('previewContainer');
  const imagePreview = document.getElementById('imagePreview');
  const removeImgBtn = document.getElementById('removeImgBtn');
  
  const outfitForm = document.getElementById('outfitForm');
  const loadingState = document.getElementById('loadingState');
  const resultsSection = document.getElementById('resultsSection');

  // Trigger input selection
  dropZone.addEventListener('click', (e) => {
    if (e.target !== removeImgBtn) {
      imageInput.click();
    }
  });

  // Drag and drop events
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--accent-blue)';
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'var(--border-light)';
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border-light)';
    if (e.dataTransfer.files.length) {
      imageInput.files = e.dataTransfer.files;
      previewImage(e.dataTransfer.files[0]);
    }
  });

  imageInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      previewImage(e.target.files[0]);
    }
  });

  function previewImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      uploadPrompt.classList.add('hidden');
      previewContainer.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  removeImgBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    imageInput.value = '';
    imagePreview.src = '';
    previewContainer.classList.add('hidden');
    uploadPrompt.classList.remove('hidden');
  });

  // Form Submission handling
  outfitForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!imageInput.files.length) {
      alert('Please select or drop an outfit image.');
      return;
    }

    const formData = new FormData();
    formData.append('image', imageInput.files[0]);
    formData.append('occasion', document.getElementById('occasion').value);
    formData.append('persona', document.getElementById('persona').value);

    resultsSection.classList.add('hidden');
    loadingState.classList.remove('hidden');

    try {
      const response = await fetch('/api/rate-outfit', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed.');
      }

      document.getElementById('scoreVal').textContent = data.score ?? '8.5';
      document.getElementById('vibeTag').textContent = data.vibe ?? 'CONTEMPORARY MINIMALISM';
      document.getElementById('summaryText').textContent = data.summary ?? '';

      populateList('prosList', data.pros);
      populateList('consList', data.cons);
      populateList('tipsList', data.tips);

      resultsSection.classList.remove('hidden');
    } catch (err) {
      alert(err.message);
    } finally {
      loadingState.classList.add('hidden');
    }
  });

  function populateList(elementId, items) {
    const list = document.getElementById(elementId);
    list.innerHTML = '';
    if (items && Array.isArray(items)) {
      items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
      });
    }
  }
});