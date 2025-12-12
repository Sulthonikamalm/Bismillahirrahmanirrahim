(function() {
    'use strict';

    const toggleBtn = document.getElementById('actionToggleBtn');
    const actionMenu = document.getElementById('actionMenu');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            actionMenu.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            actionMenu.classList.remove('show');
        });
    }

    document.getElementById('previewAction')?.addEventListener('click', () => {
        const title = document.getElementById('postJudul').value;
        const content = document.getElementById('editorContent').innerHTML;
        const author = document.querySelector('.user-name').textContent;
        const imgInput = document.getElementById('imageUpload');

        if (imgInput.files && imgInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function (e) {
                saveAndOpenPreview(title, content, author, e.target.result);
            }
            reader.readAsDataURL(imgInput.files[0]);
        } else {
            saveAndOpenPreview(title, content, author, '');
        }
    });

    function saveAndOpenPreview(title, content, author, headerImg) {
        const previewData = {
            id: 'preview',
            judul: title || 'Judul Preview',
            isi_postingan: content,
            author: { name: author },
            created_at: new Date().toISOString(),
            gambar_header_url: headerImg,
            isPreview: true
        };

        localStorage.setItem('blog_preview_data', JSON.stringify(previewData));
        window.open('../../../Blog/baca.html?preview=true', '_blank');
    }

    document.addEventListener('DOMContentLoaded', function () {
        console.log('🚀 Editor script initializing...');

        const editorContent = document.getElementById('editorContent');
        const postIsi = document.getElementById('postIsi');
        const floatingToolbar = document.getElementById('floatingToolbar');

        function syncContent() {
            if (editorContent && postIsi) {
                postIsi.value = editorContent.innerHTML;
            }
        }

        function execCommand(command, value = null) {
            document.execCommand(command, false, value);
            editorContent.focus();
            syncContent();
        }

        function formatBlock(tag) {
            execCommand('formatBlock', tag);
        }

        // Initialize Image Resizer
        if (editorContent && typeof window.initImageResizer === 'function') {
            window.imageResizer = window.initImageResizer(editorContent);
            console.log('✅ Image Resizer initialized');
        }

        const tabUpload = document.getElementById('tabUpload');
        const tabUrl = document.getElementById('tabUrl');
        const viewUpload = document.getElementById('viewUpload');
        const viewUrl = document.getElementById('viewUrl');

        tabUpload?.addEventListener('click', () => {
            tabUpload.classList.add('active');
            tabUrl.classList.remove('active');
            viewUpload.style.display = 'block';
            viewUrl.style.display = 'none';
        });

        tabUrl?.addEventListener('click', () => {
            tabUpload.classList.remove('active');
            tabUrl.classList.add('active');
            viewUpload.style.display = 'none';
            viewUrl.style.display = 'block';
        });

        let uploadedImageUrl = '';
        const fileInput = document.getElementById('editorImageFile');
        const statusDiv = document.getElementById('uploadStatus');

        fileInput?.addEventListener('change', async function () {
            if (this.files && this.files[0]) {
                const formData = new FormData();
                formData.append('image', this.files[0]);
                statusDiv.innerHTML = '<span class="text-primary">Uploading...</span>';

                try {
                    console.log('📤 Uploading image...');
                    const res = await fetch('../../../api/blog/upload_image.php', {
                        method: 'POST',
                        credentials: 'include', // ✅ Include session cookies
                        body: formData
                    });
                    
                    console.log('Response status:', res.status);
                    const data = await res.json();
                    console.log('Response data:', data);

                    if (data.status === 'success') {
                        const relativePath = data.url.startsWith('/') ? data.url.substring(1) : data.url;
                        uploadedImageUrl = '../../../' + relativePath;
                        statusDiv.innerHTML = '<span class="text-success">✓ Ready to insert</span>';
                        console.log('✅ Upload success! URL:', uploadedImageUrl);
                    } else {
                        statusDiv.innerHTML = `<span class="text-danger">✗ ${data.message}</span>`;
                        console.error('❌ Upload failed:', data.message);
                    }
                } catch (e) {
                    console.error('❌ Upload error:', e);
                    statusDiv.innerHTML = '<span class="text-danger">✗ Upload failed</span>';
                }
            }
        });

        document.getElementById('insertImage')?.addEventListener('click', () => {
            console.log('🖼️ Insert Image clicked');
            
            const alt = document.getElementById('imageAlt')?.value.trim() || '';
            const activeTab = document.querySelector('.tab-btn.active');
            const isUploadTab = activeTab && activeTab.id === 'tabUpload';
            
            let finalUrl = '';

            if (isUploadTab) {
                finalUrl = uploadedImageUrl;
                console.log('📤 Upload tab - uploadedImageUrl:', finalUrl);
            } else {
                finalUrl = document.getElementById('imageUrl')?.value.trim() || '';
                console.log('🔗 URL tab - manual URL:', finalUrl);
            }

            console.log('Final URL:', finalUrl);

            if (finalUrl) {
                // Focus editor first
                if (editorContent) {
                    editorContent.focus();
                    console.log('✓ Editor focused');
                }

                const html = `<img src="${finalUrl}" alt="${alt}" style="max-width:100%; height:auto; margin: 20px 0; border-radius:8px;" /><br>`;
                
                try {
                    // Try execCommand first
                    const success = document.execCommand('insertHTML', false, html);
                    console.log('execCommand result:', success);
                    
                    if (!success) {
                        // Fallback: Direct insertion at cursor or end
                        console.log('⚠️ execCommand failed, using fallback');
                        const selection = window.getSelection();
                        
                        if (selection.rangeCount > 0) {
                            const range = selection.getRangeAt(0);
                            range.deleteContents();
                            const node = range.createContextualFragment(html);
                            range.insertNode(node);
                            console.log('✓ Inserted at cursor position');
                        } else {
                            // Last resort: append to end
                            editorContent.innerHTML += html;
                            console.log('✓ Appended to end');
                        }
                    } else {
                        console.log('✅ Image inserted via execCommand');
                    }
                    
                    // Sync content
                    syncContent();
                    
                    console.log('✅ Image insertion complete');
                } catch (e) {
                    console.error('❌ Insert error:', e);
                    // Final fallback
                    editorContent.innerHTML += html;
                    syncContent();
                    console.log('✓ Used final fallback - appended');
                }

                // Reset form
                uploadedImageUrl = '';
                if (fileInput) fileInput.value = '';
                if (statusDiv) statusDiv.innerHTML = '';
                const urlInput = document.getElementById('imageUrl');
                const altInput = document.getElementById('imageAlt');
                if (urlInput) urlInput.value = '';
                if (altInput) altInput.value = '';
                document.getElementById('imageModal').classList.remove('show');
            } else {
                console.error('❌ No URL - uploadedImageUrl:', uploadedImageUrl);
                alert('Harap masukkan URL gambar atau upload file terlebih dahulu.');
            }
        });

        document.getElementById('cancelImage')?.addEventListener('click', () => {
            uploadedImageUrl = '';
            fileInput.value = '';
            statusDiv.innerHTML = '';
            document.getElementById('imageUrl').value = '';
            document.getElementById('imageAlt').value = '';
            document.getElementById('imageModal').classList.remove('show');
        });

        document.getElementById('undoBtn')?.addEventListener('click', () => execCommand('undo'));
        document.getElementById('redoBtn')?.addEventListener('click', () => execCommand('redo'));
        document.getElementById('boldBtn')?.addEventListener('click', () => execCommand('bold'));
        document.getElementById('italicBtn')?.addEventListener('click', () => execCommand('italic'));
        document.getElementById('underlineBtn')?.addEventListener('click', () => execCommand('underline'));
        document.getElementById('strikeBtn')?.addEventListener('click', () => execCommand('strikeThrough'));

        document.getElementById('h1Btn')?.addEventListener('click', () => formatBlock('h1'));
        document.getElementById('h2Btn')?.addEventListener('click', () => formatBlock('h2'));
        document.getElementById('h3Btn')?.addEventListener('click', () => formatBlock('h3'));
        document.getElementById('pBtn')?.addEventListener('click', () => formatBlock('p'));

        document.getElementById('alignLeftBtn')?.addEventListener('click', () => execCommand('justifyLeft'));
        document.getElementById('alignCenterBtn')?.addEventListener('click', () => execCommand('justifyCenter'));
        document.getElementById('alignRightBtn')?.addEventListener('click', () => execCommand('justifyRight'));
        document.getElementById('alignJustifyBtn')?.addEventListener('click', () => execCommand('justifyFull'));

        document.getElementById('bulletBtn')?.addEventListener('click', () => execCommand('insertUnorderedList'));
        document.getElementById('numberBtn')?.addEventListener('click', () => execCommand('insertOrderedList'));

        document.getElementById('indentBtn')?.addEventListener('click', () => execCommand('indent'));
        document.getElementById('outdentBtn')?.addEventListener('click', () => execCommand('outdent'));

        document.getElementById('quoteBtn')?.addEventListener('click', () => formatBlock('blockquote'));
        document.getElementById('hrBtn')?.addEventListener('click', () => execCommand('insertHorizontalRule'));

        document.getElementById('fontSelect')?.addEventListener('change', function () {
            execCommand('fontName', this.value);
        });

        if (floatingToolbar) {
            document.addEventListener('mouseup', function (e) {
                setTimeout(() => {
                    const selection = window.getSelection();
                    if (!editorContent) return;

                    if (editorContent.contains(selection.anchorNode)) {
                        const selectedText = selection.toString().trim();
                        if (selectedText.length > 0) {
                            const range = selection.getRangeAt(0);
                            const rect = range.getBoundingClientRect();
                            floatingToolbar.classList.add('show');
                            floatingToolbar.style.left = `${rect.left + (rect.width / 2) - (floatingToolbar.offsetWidth / 2)}px`;
                            floatingToolbar.style.top = `${rect.top + window.scrollY - floatingToolbar.offsetHeight - 10}px`;
                        } else {
                            floatingToolbar.classList.remove('show');
                        }
                    } else {
                        floatingToolbar.classList.remove('show');
                    }
                }, 10);
            });

            floatingToolbar.querySelectorAll('.floating-btn').forEach(btn => {
                btn.addEventListener('mousedown', function (e) {
                    e.preventDefault();
                    const command = this.getAttribute('data-command');
                    execCommand(command);
                });
            });
        }

        const imageBtn = document.getElementById('imageBtn');
        const imageModal = document.getElementById('imageModal');

        console.log('=== IMAGE BUTTON DEBUG ===');
        console.log('Image Button Element:', imageBtn);
        console.log('Image Modal Element:', imageModal);

        if (imageBtn) {
            console.log('✓ Image button found, attaching event listener...');
            imageBtn.addEventListener('click', (e) => {
                console.log('🖱️ IMAGE BUTTON CLICKED!');
                e.preventDefault();

                if (imageModal) {
                    console.log('✓ Modal found, opening...');
                    imageModal.classList.add('show');
                    console.log('Modal classes after add:', imageModal.className);
                } else {
                    console.error('✗ Image modal not found!');
                }
            });
            console.log('✓ Event listener attached successfully');
        } else {
            console.error('✗ Image button NOT found! Check HTML for id="imageBtn"');
        }

        document.getElementById('linkBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            const url = prompt('Masukkan URL:');
            if (url) {
                execCommand('createLink', url);
            }
        });

        const linkModal = document.getElementById('linkModal');

        [linkModal, imageModal].forEach(modal => {
            if (modal) {
                modal.addEventListener('click', function (e) {
                    if (e.target === this) {
                        this.classList.remove('show');
                    }
                });
            }
        });

        if (editorContent) {
            editorContent.addEventListener('input', syncContent);
            editorContent.addEventListener('paste', () => setTimeout(syncContent, 10));
        }

        console.log('✅ Editor script initialized successfully');
    });

})();
