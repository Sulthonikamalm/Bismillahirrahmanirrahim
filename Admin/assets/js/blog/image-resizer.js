/**
 * Image Resizer - Word-like Functionality
 * Makes images in editor resizable with drag handles
 */

class ImageResizer {
    constructor(editorElement) {
        this.editor = editorElement;
        this.currentImage = null;
        this.isResizing = false;
        this.resizeHandle = null;
        this.startX = 0;
        this.startY = 0;
        this.startWidth = 0;
        this.startHeight = 0;
        this.aspectRatio = 1;
        
        this.init();
    }

    init() {
        // Watch for new images
        this.observeImages();
        
        // Click outside to deselect
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.resizable-image-wrapper')) {
                this.deselectAll();
            }
        });
    }

    observeImages() {
        // Use MutationObserver to detect new images
        const observer = new MutationObserver(() => {
            this.wrapImages();
        });

        observer.observe(this.editor, {
            childList: true,
            subtree: true
        });

        // Initial wrap
        this.wrapImages();
    }

    wrapImages() {
        const images = this.editor.querySelectorAll('img:not([data-wrapped])');
        
        images.forEach(img => {
            if (img.closest('.resizable-image-wrapper')) return;
            
            img.setAttribute('data-wrapped', 'true');
            this.wrapImage(img);
        });
    }

    wrapImage(img) {
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'resizable-image-wrapper';
        wrapper.contentEditable = false;
        
        // Wrap image
        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);

        // Add resize handles
        this.addHandles(wrapper);
        
        // Add delete button
        this.addDeleteButton(wrapper);
        
        // Add size info tooltip
        this.addSizeInfo(wrapper);

        // Add event listeners
        this.addEventListeners(wrapper);
    }

    addHandles(wrapper) {
        const positions = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
        
        positions.forEach(pos => {
            const handle = document.createElement('div');
            handle.className = `resize-handle ${pos}`;
            handle.setAttribute('data-position', pos);
            wrapper.appendChild(handle);

            // Handle resize
            handle.addEventListener('mousedown', (e) => this.startResize(e, wrapper, pos));
        });
    }

    addDeleteButton(wrapper) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'image-delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Delete image';
        deleteBtn.type = 'button';
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Delete this image?')) {
                wrapper.remove();
            }
        });
        
        wrapper.appendChild(deleteBtn);
    }

    addSizeInfo(wrapper) {
        const sizeInfo = document.createElement('div');
        sizeInfo.className = 'image-size-info';
        wrapper.appendChild(sizeInfo);
        
        // Add image toolbar for alignment and size controls
        this.addToolbar(wrapper);
    }

    addToolbar(wrapper) {
        const toolbar = document.createElement('div');
        toolbar.className = 'image-toolbar';
        
        toolbar.innerHTML = `
            <button class="image-toolbar-btn" data-action="align" data-value="left" title="Align Left">
                <i class="bi bi-text-left"></i>
            </button>
            <button class="image-toolbar-btn active" data-action="align" data-value="center" title="Align Center">
                <i class="bi bi-text-center"></i>
            </button>
            <button class="image-toolbar-btn" data-action="align" data-value="right" title="Align Right">
                <i class="bi bi-text-right"></i>
            </button>
            <div class="toolbar-separator"></div>
            <button class="image-toolbar-btn size-btn" data-action="size" data-value="small" title="Small (300px)">
                Small
            </button>
            <button class="image-toolbar-btn size-btn" data-action="size" data-value="medium" title="Medium (500px)">
                Medium
            </button>
            <button class="image-toolbar-btn size-btn" data-action="size" data-value="large" title="Large (700px)">
                Large
            </button>
            <button class="image-toolbar-btn size-btn" data-action="size" data-value="original" title="Original Size">
                Original
            </button>
        `;
        
        wrapper.appendChild(toolbar);
        
        // Add toolbar button listeners
        toolbar.querySelectorAll('.image-toolbar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const value = btn.dataset.value;
                
                if (action === 'align') {
                    this.setAlignment(wrapper, value, btn);
                } else if (action === 'size') {
                    this.setSize(wrapper, value, btn);
                }
            });
        });
    }

    setAlignment(wrapper, align, clickedBtn) {
        // Remove all alignment classes
        wrapper.classList.remove('align-left', 'align-center', 'align-right');
        
        // Add new alignment
        wrapper.classList.add(`align-${align}`);
        
        // Update button states
        const toolbar = wrapper.querySelector('.image-toolbar');
        toolbar.querySelectorAll('[data-action="align"]').forEach(btn => {
            btn.classList.remove('active');
        });
        clickedBtn.classList.add('active');
        
        console.log(`Image aligned: ${align}`);
    }

    setSize(wrapper, size, clickedBtn) {
        const img = wrapper.querySelector('img');
        if (!img) return;
        
        // Get original dimensions
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;
        const aspectRatio = naturalWidth / naturalHeight;
        
        let newWidth;
        
        switch(size) {
            case 'small':
                newWidth = 300;
                break;
            case 'medium':
                newWidth = 500;
                break;
            case 'large':
                newWidth = 700;
                break;
            case 'original':
                newWidth = naturalWidth;
                break;
        }
        
        // Respect editor max width
        const maxWidth = this.editor.clientWidth - 40;
        newWidth = Math.min(newWidth, maxWidth);
        
        const newHeight = newWidth / aspectRatio;
        
        // Apply size
        img.style.width = Math.round(newWidth) + 'px';
        img.style.height = Math.round(newHeight) + 'px';
        
        // Update size info
        this.updateSizeInfo(wrapper, Math.round(newWidth), Math.round(newHeight));
        
        // Update button states (optional - show active size)
        const toolbar = wrapper.querySelector('.image-toolbar');
        toolbar.querySelectorAll('[data-action="size"]').forEach(btn => {
            btn.classList.remove('active');
        });
        clickedBtn.classList.add('active');
        
        console.log(`Image size set to: ${size} (${Math.round(newWidth)}px)`);
    }

    addEventListeners(wrapper) {
        const img = wrapper.querySelector('img');

        // Select on click
        wrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectImage(wrapper);
        });

        // Double click for properties (future enhancement)
        img.addEventListener('dblclick', () => {
            // Could open image properties dialog
            console.log('Double clicked image');
        });
    }

    selectImage(wrapper) {
        this.deselectAll();
        wrapper.classList.add('selected');
        this.currentImage = wrapper;
    }

    deselectAll() {
        const selected = this.editor.querySelectorAll('.resizable-image-wrapper.selected');
        selected.forEach(el => el.classList.remove('selected'));
        this.currentImage = null;
    }

    startResize(e, wrapper, position) {
        e.preventDefault();
        e.stopPropagation();

        this.isResizing = true;
        this.resizeHandle = position;
        this.currentImage = wrapper;
 
        const img = wrapper.querySelector('img');
        const rect = img.getBoundingClientRect();

        this.startX = e.clientX;
        this.startY = e.clientY;
        this.startWidth = rect.width;
        this.startHeight = rect.height;
        this.aspectRatio = rect.width / rect.height;

        wrapper.classList.add('resizing');

        // Add document listeners
        document.addEventListener('mousemove', this.handleResize);
        document.addEventListener('mouseup', this.stopResize);

        // Show size info
        this.updateSizeInfo(wrapper, Math.round(rect.width), Math.round(rect.height));
    }

    handleResize = (e) => {
        if (!this.isResizing || !this.currentImage) return;

        const img = this.currentImage.querySelector('img');
        const deltaX = e.clientX - this.startX;
        const deltaY = e.clientY - this.startY;

        let newWidth = this.startWidth;
        let newHeight = this.startHeight;

        // Calculate new size based on handle position
        switch (this.resizeHandle) {
            case 'se': // Southeast (bottom-right)
            case 'nw': // Northwest (top-left) - inverse
                if (this.resizeHandle === 'se') {
                    newWidth = this.startWidth + deltaX;
                } else {
                    newWidth = this.startWidth - deltaX;
                }
                newHeight = newWidth / this.aspectRatio;
                break;

            case 'ne': // Northeast (top-right)
            case 'sw': // Southwest (bottom-left)
                if (this.resizeHandle === 'ne') {
                    newWidth = this.startWidth + deltaX;
                } else {
                    newWidth = this.startWidth - deltaX;
                }
                newHeight = newWidth / this.aspectRatio;
                break;

            case 'e': // East (right)
            case 'w': // West (left)
                if (this.resizeHandle === 'e') {
                    newWidth = this.startWidth + deltaX;
                } else {
                    newWidth = this.startWidth - deltaX;
                }
                newHeight = newWidth / this.aspectRatio;
                break;

            case 'n': // North (top)
            case 's': // South (bottom)
                if (this.resizeHandle === 's') {
                    newHeight = this.startHeight + deltaY;
                } else {
                    newHeight = this.startHeight - deltaY;
                }
                newWidth = newHeight * this.aspectRatio;
                break;
        }

        // Minimum size constraints
        newWidth = Math.max(50, newWidth);
        newHeight = Math.max(50, newHeight);

        // Maximum size constraint (editor width)
        const maxWidth = this.editor.clientWidth - 40;
        if (newWidth > maxWidth) {
            newWidth = maxWidth;
            newHeight = newWidth / this.aspectRatio;
        }

        // Apply new size
        img.style.width = Math.round(newWidth) + 'px';
        img.style.height = Math.round(newHeight) + 'px';

        // Update size info
        this.updateSizeInfo(this.currentImage, Math.round(newWidth), Math.round(newHeight));
    }

    stopResize = () => {
        if (!this.isResizing) return;

        this.isResizing = false;
        this.resizeHandle = null;

        if (this.currentImage) {
            this.currentImage.classList.remove('resizing');
        }

        // Remove document listeners
        document.removeEventListener('mousemove', this.handleResize);
        document.removeEventListener('mouseup', this.stopResize);
    }

    updateSizeInfo(wrapper, width, height) {
        const sizeInfo = wrapper.querySelector('.image-size-info');
        if (sizeInfo) {
            sizeInfo.textContent = `${width} × ${height} px`;
        }
    }
}

// Auto-initialize when editor is ready
if (typeof window.initImageResizer === 'undefined') {
    window.initImageResizer = function(editorElement) {
        if (editorElement) {
            return new ImageResizer(editorElement);
        }
    };
}
