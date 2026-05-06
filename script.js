// ============================================
// PROMPT VAULT - Complete Working Version
// ============================================

// Constants
const APP_NAME = 'Prompt Vault';
const APP_VERSION = '2.1';
const STORAGE_KEYS = {
    PROMPTS: 'promptVault_v2',
    FAVORITES: 'promptFavorites_v2',
    TEMPLATES: 'promptTemplates_v2',
    SETTINGS: 'promptSettings_v2',
    CATEGORIES: 'promptCategories_v2',
    CUSTOM_ORDER: 'promptCustomOrder_v2'
};

const DEFAULT_CATEGORIES = {
    'art': { name: 'Art & Images', color: '#ef476f', icon: 'fas fa-palette' },
    'writing': { name: 'Writing', color: '#ffd166', icon: 'fas fa-pen-fancy' },
    'code': { name: 'Code & Technical', color: '#06d6a0', icon: 'fas fa-code' },
    'analysis': { name: 'Analysis', color: '#118ab2', icon: 'fas fa-chart-bar' },
    'creative': { name: 'Creative', color: '#7209b7', icon: 'fas fa-lightbulb' },
    'other': { name: 'Other', color: '#6c757d', icon: 'fas fa-folder' }
};

// State Management
let state = {
    prompts: [],
    favorites: [],
    templates: [],
    categories: new Map(),
    currentFilter: 'all',
    currentSort: 'newest',
    currentView: 'grid',
    selectedPrompts: new Set(),
    searchQuery: '',
    currentPage: 1,
    pageSize: 12,
    editingPromptId: null,
    pendingConfirmAction: null,
    imageCache: new Map(),
    customOrder: [],
    draggedPromptId: null,
    undoStack: [],
    redoStack: [],
    settings: {
        theme: 'light',
        autoSave: true,
        enableAnimations: true,
        showImages: true,
        compactMode: false,
        itemsPerPage: 12
    }
};

// DOM Elements Cache
const elements = {};

// Initialize App
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    console.log(`🚀 ${APP_NAME} v${APP_VERSION} Initializing...`);
    
    try {
        // Load state from storage
        loadState();
        
        // Cache DOM elements
        cacheElements();
        
        // Initialize UI
        initializeUI();
        
        // Setup event listeners
        setupEventListeners();
        
        // Load initial data
        loadData();
        
        // Update UI
        updateUI();
        
        console.log('✅ App initialized successfully');
        showToast('Welcome to Prompt Vault!', 'success');
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        showToast('Failed to initialize app', 'error');
    }
}

// State Management
function loadState() {
    try {
        // Load settings
        const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (settings) {
            state.settings = { ...state.settings, ...JSON.parse(settings) };
        }
        
        // Apply theme
        document.documentElement.setAttribute('data-theme', state.settings.theme);
        
        // Load prompts
        const promptsData = localStorage.getItem(STORAGE_KEYS.PROMPTS);
        if (promptsData) {
            state.prompts = JSON.parse(promptsData);
        }
        
        // Load favorites
        const favoritesData = localStorage.getItem(STORAGE_KEYS.FAVORITES);
        if (favoritesData) {
            state.favorites = JSON.parse(favoritesData);
        }
        
        // Load templates
        const templatesData = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
        if (templatesData) {
            state.templates = JSON.parse(templatesData);
        }
        
        // Load categories
        const categoriesData = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
        if (categoriesData) {
            const categories = JSON.parse(categoriesData);
            categories.forEach(cat => state.categories.set(cat.id, cat));
        } else {
            // Initialize default categories
            Object.entries(DEFAULT_CATEGORIES).forEach(([id, data]) => {
                state.categories.set(id, {
                    id,
                    name: data.name,
                    color: data.color,
                    icon: data.icon,
                    count: 0,
                    createdAt: new Date().toISOString()
                });
            });
            saveCategories();
        }
        
        // Add sample data if empty
        if (state.prompts.length === 0) {
            addSampleData();
        }
        
        // Load custom order
        const customOrderData = localStorage.getItem(STORAGE_KEYS.CUSTOM_ORDER);
        if (customOrderData) {
            state.customOrder = JSON.parse(customOrderData);
        } else {
            // Initialize custom order from current prompts array order
            state.customOrder = state.prompts.map(p => p.id);
            saveCustomOrder();
        }
        
        // Ensure all prompts are in the custom order
        state.prompts.forEach(p => {
            if (!state.customOrder.includes(p.id)) {
                state.customOrder.push(p.id);
            }
        });

        // Ensure every prompt has a serial number
        migratePromptSerialNumbers();
        
        console.log('📦 State loaded successfully');
    } catch (error) {
        console.error('❌ Failed to load state:', error);
    }
}

function getNextSerialNumber() {
    const maxSerial = state.prompts.reduce((max, prompt) => {
        const serial = Number.isInteger(prompt.serialNumber) && prompt.serialNumber > 0 ? prompt.serialNumber : 0;
        return Math.max(max, serial);
    }, 0);
    return maxSerial + 1;
}

function migratePromptSerialNumbers() {
    let nextSerial = getNextSerialNumber();
    state.prompts.forEach(prompt => {
        if (!Number.isInteger(prompt.serialNumber) || prompt.serialNumber < 1) {
            prompt.serialNumber = nextSerial++;
        }
    });
    saveState();
}

function saveState() {
    try {
        // Save to localStorage
        localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(state.prompts));
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(state.favorites));
        localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(state.templates));
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
        saveCustomOrder();
        
        console.log('💾 State saved');
    } catch (error) {
        console.error('❌ Failed to save state:', error);
    }
}

function saveCategories() {
    try {
        const categoriesArray = Array.from(state.categories.values());
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categoriesArray));
        console.log('📁 Categories saved');
    } catch (error) {
        console.error('❌ Failed to save categories:', error);
    }
}

// DOM Elements Caching
function cacheElements() {
    elements.promptsContainer = document.getElementById('promptsContainer');
    elements.searchInput = document.getElementById('searchInput');
    elements.searchSuggestions = document.getElementById('searchSuggestions');
    elements.categoryList = document.getElementById('categoriesList');
    elements.totalPrompts = document.getElementById('totalPrompts');
    elements.totalFavorites = document.getElementById('totalFavorites');
    elements.totalCategories = document.getElementById('totalCategories');
    elements.promptsToday = document.getElementById('promptsToday');
    elements.showingCount = document.getElementById('showingCount');
    elements.totalCount = document.getElementById('totalCount');
    elements.totalWords = document.getElementById('totalWords');
    elements.totalTokens = document.getElementById('totalTokens');
    
    console.log('🔍 DOM elements cached');
}

// UI Initialization
function initializeUI() {
    // Initialize theme
    updateTheme();
    
    // Initialize categories dropdown
    initializeCategoriesDropdown();
    
    // Initialize view mode
    setViewMode(state.settings.compactMode ? 'compact' : 'grid');
    
    // Set active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === state.currentFilter);
    });
    
    // Set active sort option
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.value = state.currentSort;
    }
    
    console.log('🎨 UI initialized');
}

function initializeCategoriesDropdown() {
    const select = document.getElementById('promptCategory');
    if (!select) return;
    
    // Clear existing options except the first one
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Add categories
    state.categories.forEach((category, id) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = category.name;
        select.appendChild(option);
    });
}

// Event Listeners
function setupEventListeners() {
    // Search
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
        elements.searchInput.addEventListener('keydown', handleSearchKeydown);
    }

    // Category management
    document.getElementById('addCategoryBtn')?.addEventListener('click', showAddCategoryForm);
    document.getElementById('manageCategoriesBtn')?.addEventListener('click', showManageCategoriesModal);
    document.getElementById('saveCategoryBtn')?.addEventListener('click', saveNewCategory);
    document.getElementById('cancelCategoryBtn')?.addEventListener('click', hideAddCategoryForm);
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => handleFilterChange(btn.dataset.filter));
    });
    
    // View controls
    document.getElementById('gridViewBtn')?.addEventListener('click', () => setViewMode('grid'));
    document.getElementById('listViewBtn')?.addEventListener('click', () => setViewMode('list'));
    document.getElementById('compactViewBtn')?.addEventListener('click', () => setViewMode('compact'));
    
    // Sort controls
    document.getElementById('sortSelect')?.addEventListener('change', handleSortChange);
    
    // Add prompt buttons
    document.getElementById('addPromptBtn')?.addEventListener('click', showAddPromptModal);
    document.getElementById('addFirstPromptBtn')?.addEventListener('click', showAddPromptModal);
    document.getElementById('fabButton')?.addEventListener('click', showAddPromptModal);
    
    // Import/Export
    document.getElementById('importBtn')?.addEventListener('click', handleImportClick);
    document.getElementById('exportBtn')?.addEventListener('click', handleExport);
    document.getElementById('importSampleBtn')?.addEventListener('click', importSampleData);
    document.getElementById('importFile')?.addEventListener('change', handleFileImport);
    
    // Theme toggle
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    
    // Category management
    document.getElementById('addCategoryBtn')?.addEventListener('click', showAddCategoryForm);
    document.getElementById('saveCategoryBtn')?.addEventListener('click', saveNewCategory);
    document.getElementById('cancelCategoryBtn')?.addEventListener('click', hideAddCategoryForm);
    
    // Bulk actions
    document.getElementById('selectAllBtn')?.addEventListener('click', toggleSelectAll);
    document.getElementById('bulkDeleteBtn')?.addEventListener('click', deleteSelectedPrompts);
    document.getElementById('compareBtn')?.addEventListener('click', showComparisonModal);
    document.getElementById('bulkEditBtn')?.addEventListener('click', showBulkEditModal);
    document.getElementById('findDuplicatesBtn')?.addEventListener('click', findDuplicatePrompts);
    document.getElementById('clearCacheBtn')?.addEventListener('click', clearAllCaches);
    document.getElementById('backupBtn')?.addEventListener('click', createBackup);
    
    // Clear search
    document.getElementById('clearSearchBtn')?.addEventListener('click', clearSearch);
    
    // Modal events
    setupModalEvents();
    // Image preview setup (zoom/controls)
    setupImagePreview();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Window events
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Image uploads
    setupImageUploads();
    
    console.log('🎯 Event listeners set up');
}

// Event Handlers
function handleSearch(event) {
    state.searchQuery = event.target.value.trim().toLowerCase();
    state.currentPage = 1;
    
    // Update search suggestions
    updateSearchSuggestions();
    
    // Re-render prompts
    renderPrompts();
}

function handleSearchKeydown(event) {
    if (event.key === 'Escape') {
        clearSearch();
    }
}

function handleFilterChange(filter) {
    state.currentFilter = filter;
    state.currentPage = 1;
    state.selectedPrompts.clear();
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    // Update bulk delete button visibility
    updateBulkDeleteButton();
    
    // Re-render prompts
    renderPrompts();
}

function handleSortChange(event) {
    state.currentSort = event.target.value;
    renderPrompts();
}

function handleImportClick() {
    document.getElementById('importFile').click();
}

async function handleExport() {
    try {
        const exportData = {
            prompts: state.prompts,
            templates: state.templates,
            categories: Array.from(state.categories.values()),
            exportedAt: new Date().toISOString(),
            version: APP_VERSION
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `prompt-vault-${formatDate(new Date())}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Data exported successfully', 'success');
    } catch (error) {
        console.error('❌ Export failed:', error);
        showToast('Export failed', 'error');
    }
}

function importSampleData() {
    const samplePrompts = [
        {
            id: generateId(),
            serialNumber: 1,
            title: "Fantasy Landscape Generator",
            category: "art",
            content: "Create a breathtaking fantasy landscape with towering mountains, mystical forests, and a crystal-clear river flowing through a magical valley. Digital painting style, highly detailed, epic scale, cinematic lighting, 8K resolution, trending on ArtStation.",
            tags: ["fantasy", "landscape", "digital painting", "detailed"],
            images: [],
            notes: "Works best with DALL-E 3 or Midjourney v6. Use --ar 16:9 for widescreen.",
            rating: 5,
            engine: "Midjourney",
            complexity: 4,
            usageCount: 12,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: generateId(),
            serialNumber: 2,
            title: "Python Data Analysis Template",
            category: "code",
            content: "Create a comprehensive Python script for data analysis using pandas and matplotlib. Include data loading, cleaning, exploratory analysis, visualization, and statistical summaries. Add docstrings and comments for each function.",
            tags: ["python", "data analysis", "pandas", "matplotlib", "automation"],
            images: [],
            notes: "Adjust column names and data types based on your dataset. Install required packages: pandas, matplotlib, seaborn.",
            rating: 4,
            engine: "ChatGPT",
            complexity: 3,
            usageCount: 8,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: generateId(),
            serialNumber: 3,
            title: "Marketing Copy Generator",
            category: "writing",
            content: "Generate compelling marketing copy for a [product/service]. Include: 1) Attention-grabbing headline, 2) Key benefits (3-5 points), 3) Social proof/testimonial section, 4) Clear call-to-action, 5) SEO keywords. Tone should be [professional/casual/enthusiastic].",
            tags: ["marketing", "copywriting", "seo", "conversion"],
            images: [],
            notes: "Replace [brackets] with specific details. Aim for 300-500 words.",
            rating: 4,
            engine: "ChatGPT",
            complexity: 3,
            usageCount: 15,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];
    
    state.prompts = [...samplePrompts, ...state.prompts];
    saveState();
    
    // Update UI
    updateCategoryCounts();
    updateStats();
    renderPrompts();
    
    showToast('Sample data imported successfully', 'success');
}

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.json')) {
        showToast('Please select a JSON file', 'error');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Validate imported data
            if (!importedData.prompts || !Array.isArray(importedData.prompts)) {
                throw new Error('Invalid file format');
            }
            
            showConfirmModal(
                'Import Data',
                `This will import ${importedData.prompts.length} prompts. Your current data will be preserved. Continue?`,
                () => {
                    // Merge prompts
                    importedData.prompts.forEach(prompt => {
                        // Check if prompt already exists
                        const exists = state.prompts.some(p => p.id === prompt.id);
                        if (!exists) {
                            state.prompts.push(prompt);
                        }
                    });
                    
                    // Merge templates if they exist
                    if (importedData.templates && Array.isArray(importedData.templates)) {
                        importedData.templates.forEach(template => {
                            const exists = state.templates.some(t => t.id === template.id);
                            if (!exists) {
                                state.templates.push(template);
                            }
                        });
                    }
                    
                    // Merge categories if they exist
                    if (importedData.categories && Array.isArray(importedData.categories)) {
                        importedData.categories.forEach(category => {
                            if (!state.categories.has(category.id)) {
                                state.categories.set(category.id, category);
                            }
                        });
                    }
                    
                    // Save state
                    saveState();
                    saveCategories();
                    
                    // Update UI
                    updateCategoryCounts();
                    updateStats();
                    renderPrompts();
                    initializeCategoriesDropdown();
                    
                    showToast(`Successfully imported ${importedData.prompts.length} prompts!`, 'success');
                    
                    // Reset file input
                    event.target.value = '';
                }
            );
        } catch (error) {
            console.error('Import error:', error);
            showToast('Error importing file. Please check the file format.', 'error');
        }
    };
    
    reader.readAsText(file);
}

// Data Loading
function loadData() {
    try {
        showLoading(true);
        
        // Update category counts
        updateCategoryCounts();
        
        // Update stats
        updateStats();
        
        // Render prompts
        renderPrompts();
        
        console.log('📊 Data loaded');
    } catch (error) {
        console.error('❌ Failed to load data:', error);
        showToast('Failed to load data', 'error');
    } finally {
        showLoading(false);
    }
}

// Prompt Rendering
function renderPrompts() {
    if (!elements.promptsContainer) return;
    
    // Get filtered and sorted prompts
    const filteredPrompts = getFilteredPrompts();
    const sortedPrompts = sortPrompts(filteredPrompts);
    const paginatedPrompts = paginatePrompts(sortedPrompts);
    
    // Clear container
    elements.promptsContainer.innerHTML = '';
    
    if (paginatedPrompts.length === 0) {
        showEmptyState();
        return;
    }
    
    // Create document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    // Render each prompt
    paginatedPrompts.forEach(prompt => {
        const promptElement = createPromptElement(prompt);
        fragment.appendChild(promptElement);
    });
    
    // Append to container
    elements.promptsContainer.appendChild(fragment);
    
    // Update pagination
    updatePagination(filteredPrompts.length);
    
    // Update showing count
    updateShowingCount(paginatedPrompts.length, filteredPrompts.length);
}

function createPromptElement(prompt) {
    const element = document.createElement('div');
    element.className = `prompt-card ${state.currentView}-view`;
    element.dataset.id = prompt.id;
    
    // Make draggable
    element.setAttribute('draggable', 'true');
    
    if (state.selectedPrompts.has(prompt.id)) {
        element.classList.add('selected');
    }
    
    // Calculate stats
    const wordCount = calculateWordCount(prompt.content);
    const tokenCount = estimateTokenCount(prompt.content);
    const complexity = prompt.complexity || calculateComplexity(prompt);
    
    // Create element HTML with images
    element.innerHTML = `
        <div class="prompt-card-header">
            <div class="prompt-header-content">
                <div class="drag-handle" title="Drag to reorder"><i class="fas fa-grip-vertical"></i></div>
                <div class="prompt-title">${escapeHtml(prompt.title)}</div>
                <span class="prompt-serial">#${prompt.serialNumber || getNextSerialNumber()}</span>
                <span class="prompt-category" style="background: ${getCategoryColor(prompt.category)}">
                    <i class="${getCategoryIcon(prompt.category)}"></i>
                    ${getCategoryName(prompt.category)}
                </span>
            </div>
            <div class="prompt-card-actions">
                <button class="action-btn select-btn" data-action="select" title="Select prompt">
                    <i class="fas ${state.selectedPrompts.has(prompt.id) ? 'fa-check-square' : 'fa-square'}"></i>
                </button>
                <button class="action-btn favorite-btn ${isFavorite(prompt.id) ? 'active' : ''}" 
                        data-action="favorite" title="${isFavorite(prompt.id) ? 'Remove from favorites' : 'Add to favorites'}">
                    <i class="fas ${isFavorite(prompt.id) ? 'fa-heart' : 'fa-heart'}"></i>
                </button>
            </div>
        </div>
        
        <div class="prompt-card-body">
            <div class="prompt-preview">${escapeHtml(prompt.content).substring(0, 200)}${prompt.content.length > 200 ? '...' : ''}</div>
            
            ${prompt.images && prompt.images.length > 0 ? `
                <div class="prompt-images">
                    ${prompt.images.slice(0, 3).map((img, idx) => `
                        <div class="image-thumb-wrapper">
                            <img src="${img.url}" alt="${img.type} ${idx + 1}" 
                                 class="image-thumb ${img.type}" 
                                 data-action="preview" 
                                 data-src="${img.url}"
                                 onerror="this.style.display='none'">
                            <span class="image-indicator ${img.type}">${img.type === 'input' ? 'I' : 'O'}</span>
                        </div>
                    `).join('')}
                    ${prompt.images.length > 3 ? `
                        <div class="image-thumb-wrapper">
                            <div class="image-thumb" style="background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center;">
                                <span style="color: var(--text-tertiary); font-size: 0.75rem; font-weight: 600;">+${prompt.images.length - 3}</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            
            <div class="prompt-stats">
                <span class="stat-badge" title="Word count">
                    <i class="fas fa-font"></i> ${wordCount}
                </span>
                <span class="stat-badge" title="Token estimate">
                    <i class="fas fa-microchip"></i> ${tokenCount}
                </span>
                <span class="stat-badge" title="Complexity level">
                    <i class="fas fa-chart-line"></i> ${complexity}/5
                </span>
                ${prompt.rating > 0 ? `
                    <span class="stat-badge" title="Rating">
                        <i class="fas fa-star"></i> ${prompt.rating}/5
                    </span>
                ` : ''}
            </div>
            
            ${prompt.tags && prompt.tags.length > 0 ? `
                <div class="prompt-tags">
                    ${prompt.tags.slice(0, 5).map(tag => `
                        <span class="tag">${escapeHtml(tag)}</span>
                    `).join('')}
                    ${prompt.tags.length > 5 ? `<span class="tag">+${prompt.tags.length - 5}</span>` : ''}
                </div>
            ` : ''}
        </div>
        
        <div class="prompt-card-footer">
            <div class="prompt-meta">
                <span title="Created">
                    <i class="far fa-calendar"></i> ${formatDate(prompt.createdAt)}
                </span>
                ${prompt.engine ? `
                    <span title="AI Engine">
                        <i class="fas fa-robot"></i> ${prompt.engine}
                    </span>
                ` : ''}
            </div>
            <div class="prompt-actions">
                <button class="action-btn copy-btn" data-action="copy" title="Copy prompt">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="action-btn edit-btn" data-action="edit" title="Edit prompt">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn view-btn" data-action="view" title="View details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn delete-btn" data-action="delete" title="Delete prompt">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners
    addPromptEventListeners(element, prompt);
    
    // Add drag-and-drop event listeners
    addDragDropListeners(element, prompt);
    
    return element;
}

function addPromptEventListeners(element, prompt) {
    // Select button
    const selectBtn = element.querySelector('.select-btn');
    if (selectBtn) {
        selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePromptSelection(prompt.id);
        });
    }
    
    // Favorite button
    const favoriteBtn = element.querySelector('.favorite-btn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(prompt.id);
            // Update button state
            favoriteBtn.classList.toggle('active');
            favoriteBtn.title = isFavorite(prompt.id) ? 'Remove from favorites' : 'Add to favorites';
        });
    }
    
    // Action buttons
    const actionButtons = element.querySelectorAll('.prompt-actions .action-btn');
    actionButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            handlePromptAction(action, prompt);
        });
    });
    
    // Image preview in prompt cards
    const imageThumbs = element.querySelectorAll('.image-thumb[src]');
    imageThumbs.forEach(img => {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            showImagePreview(img.src, prompt.title);
        });
    });

    
    // Click on card to view details
    element.addEventListener('click', (e) => {
        if (!e.target.closest('.action-btn') && !e.target.closest('.select-btn')) {
            showPromptDetails(prompt);
        }
    });
}

// Helper function to ensure image data is properly stored
function storeImageData(type, index, imageData) {
    const cacheId = `image-${type}-${index}`;
    // Store as base64 string
    state.imageCache.set(cacheId, imageData);
    return cacheId;
}

function handlePromptAction(action, prompt) {
    switch (action) {
        case 'copy':
            copyPrompt(prompt);
            break;
        case 'edit':
            editPrompt(prompt.id);
            break;
        case 'view':
            showPromptDetails(prompt);
            break;
        case 'delete':
            deletePrompt(prompt.id);
            break;
    }
}

// Prompt CRUD Operations
function showAddPromptModal() {
    resetPromptForm();
    state.editingPromptId = null;
    document.getElementById('modalTitle').textContent = 'Create New Prompt';
    showModal('promptModal');
}

function editPrompt(promptId) {
    const prompt = state.prompts.find(p => p.id === promptId);
    if (!prompt) return;
    
    state.editingPromptId = promptId;
    
    // Fill form with prompt data
    document.getElementById('promptTitle').value = prompt.title;
    document.getElementById('promptCategory').value = prompt.category;
    document.getElementById('promptSerialNumber').value = prompt.serialNumber || '';
    document.getElementById('promptText').value = prompt.content;
    document.getElementById('promptNotes').value = prompt.notes || '';
    document.getElementById('promptRating').value = prompt.rating || 0;
    document.getElementById('promptEngine').value = prompt.engine || '';
    document.getElementById('promptComplexity').value = prompt.complexity || 3;
    document.getElementById('promptUsageCount').value = prompt.usageCount || 0;
    document.getElementById('promptId').value = promptId;
    
    // Load tags
    if (prompt.tags && prompt.tags.length > 0) {
        loadTags(prompt.tags);
    }
    
    // Load images
    if (prompt.images && prompt.images.length > 0) {
        loadPromptImages(prompt.images);
    }
    
    // Update character count
    updateCharCount();
    
    // Update rating
    updateRatingStars(prompt.rating || 0);
    
    document.getElementById('modalTitle').textContent = 'Edit Prompt';
    showModal('promptModal');
}

function savePrompt(event) {
    event.preventDefault();
    
    try {
        // Get form data
        const formData = getPromptFormData();
        
        // Get images - This is the key fix
        const images = getFormImages();
        
        if (state.editingPromptId) {
            // Update existing prompt WITH images
            updatePrompt(state.editingPromptId, { ...formData, images });
            showToast('Prompt updated successfully', 'success');
        } else {
            // Create new prompt WITH images
            createPrompt({ ...formData, images });
            showToast('Prompt created successfully', 'success');
        }
        
        // Save state
        saveState();
        
        // Update UI
        updateCategoryCounts();
        updateStats();
        renderPrompts();
        
        // Close modal
        closeModal('promptModal');
        
    } catch (error) {
        console.error('❌ Failed to save prompt:', error);
        showToast('Failed to save prompt', 'error');
    }
}

function getPromptFormData() {
    const title = document.getElementById('promptTitle').value.trim();
    const category = document.getElementById('promptCategory').value;
    const serialInput = document.getElementById('promptSerialNumber').value.trim();
    let serialNumber = serialInput ? parseInt(serialInput, 10) : null;
    if (!Number.isInteger(serialNumber) || serialNumber < 1) {
        serialNumber = null;
    }
    const content = document.getElementById('promptText').value.trim();
    const notes = document.getElementById('promptNotes').value.trim();
    const rating = parseInt(document.getElementById('promptRating').value) || 0;
    const engine = document.getElementById('promptEngine').value;
    const complexity = parseInt(document.getElementById('promptComplexity').value) || 3;
    const usageCount = parseInt(document.getElementById('promptUsageCount').value) || 0;
    
    // Get tags from tags container
    const tags = [];
    const tagElements = document.querySelectorAll('#tagsContainer .tag-input');
    tagElements.forEach(tagEl => {
        const tagName = tagEl.textContent.replace('×', '').trim();
        if (tagName) tags.push(tagName);
    });
    
    return {
        title,
        category,
        serialNumber,
        content,
        notes,
        rating,
        engine,
        complexity,
        usageCount,
        tags
    };
}

function createPrompt(formData) {
    const serialNumber = Number.isInteger(formData.serialNumber) && formData.serialNumber > 0
        ? formData.serialNumber
        : getNextSerialNumber();

    const newPrompt = {
        id: generateId(),
        ...formData,
        serialNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Ensure images array exists
    if (!newPrompt.images) {
        newPrompt.images = [];
    }
    
    state.prompts.unshift(newPrompt);
    
    // Add to beginning of custom order
    state.customOrder.unshift(newPrompt.id);
    saveCustomOrder();
}

function updatePrompt(promptId, formData) {
    const index = state.prompts.findIndex(p => p.id === promptId);
    if (index !== -1) {
        // Preserve existing images if none are provided
        const images = formData.images || state.prompts[index].images || [];
        const serialNumber = Number.isInteger(formData.serialNumber) && formData.serialNumber > 0
            ? formData.serialNumber
            : (Number.isInteger(state.prompts[index].serialNumber) && state.prompts[index].serialNumber > 0
                ? state.prompts[index].serialNumber
                : getNextSerialNumber());
        
        state.prompts[index] = {
            ...state.prompts[index],
            ...formData,
            serialNumber,
            images, // Ensure images are included
            updatedAt: new Date().toISOString()
        };
    }
}

function deletePrompt(promptId) {
    showConfirmModal(
        'Delete Prompt',
        'Are you sure you want to delete this prompt? This action cannot be undone.',
        () => {
            // Remove prompt
            state.prompts = state.prompts.filter(p => p.id !== promptId);
            
            // Remove from favorites
            state.favorites = state.favorites.filter(id => id !== promptId);
            
            // Remove from selected
            state.selectedPrompts.delete(promptId);
            
            // Save state
            saveState();
            
            // Update UI
            updateCategoryCounts();
            updateStats();
            renderPrompts();
            updateBulkDeleteButton();
            
            showToast('Prompt deleted', 'success');
        }
    );
}

function copyPrompt(prompt) {
    navigator.clipboard.writeText(prompt.content)
        .then(() => {
            showToast('Prompt copied to clipboard!', 'success');
        })
        .catch(err => {
            console.error('Failed to copy:', err);
            showToast('Failed to copy prompt', 'error');
        });
}

function showPromptDetails(prompt) {
    const modalContent = document.querySelector('#promptDetailsModal .modal-body');
    if (!modalContent) return;
    
    const wordCount = calculateWordCount(prompt.content);
    const tokenCount = estimateTokenCount(prompt.content);
    const complexity = prompt.complexity || calculateComplexity(prompt);
    
    // Separate input and result images
    const inputImages = prompt.images ? prompt.images.filter(img => img.type === 'input') : [];
    const resultImages = prompt.images ? prompt.images.filter(img => img.type === 'result') : [];
    
    modalContent.innerHTML = `
        <div class="prompt-details">
            <div class="details-header">
                <div>
                    <h3>${escapeHtml(prompt.title)}</h3>
                    <div class="serial-label">Serial Number: <strong>#${prompt.serialNumber || getNextSerialNumber()}</strong></div>
                </div>
                <span class="category-badge" style="background: ${getCategoryColor(prompt.category)}">
                    <i class="${getCategoryIcon(prompt.category)}"></i>
                    ${getCategoryName(prompt.category)}
                </span>
            </div>
            
            <div class="details-content">
                <div class="section">
                    <h4><i class="fas fa-comment-dots"></i> Prompt Content</h4>
                    <div class="content-box">${escapeHtml(prompt.content).replace(/\n/g, '<br>')}</div>
                </div>
                
                ${prompt.notes ? `
                    <div class="section">
                        <h4><i class="fas fa-sticky-note"></i> Notes</h4>
                        <div class="notes-box">${escapeHtml(prompt.notes).replace(/\n/g, '<br>')}</div>
                    </div>
                ` : ''}
                
                <!-- Input Images Section -->
                ${inputImages.length > 0 ? `
                    <div class="section">
                        <h4><i class="fas fa-upload"></i> Input Reference Images (${inputImages.length})</h4>
                        <div class="images-grid">
                            ${inputImages.map((img, idx) => `
                                <div style="position: relative;">
                                    <img src="${img.url}" alt="Input ${idx + 1}" 
                                         class="image-thumb input" 
                                         data-action="preview" 
                                         data-src="${img.url}"
                                         style="cursor: pointer; width: 100%; height: 150px; object-fit: cover; border-radius: 8px;">
                                    <span class="image-indicator input" style="position: absolute; top: 8px; left: 8px;">INPUT</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Result Images Section -->
                ${resultImages.length > 0 ? `
                    <div class="section">
                        <h4><i class="fas fa-image"></i> Result Reference Images (${resultImages.length})</h4>
                        <div class="images-grid">
                            ${resultImages.map((img, idx) => `
                                <div style="position: relative;">
                                    <img src="${img.url}" alt="Result ${idx + 1}" 
                                         class="image-thumb result" 
                                         data-action="preview" 
                                         data-src="${img.url}"
                                         style="cursor: pointer; width: 100%; height: 150px; object-fit: cover; border-radius: 8px;">
                                    <span class="image-indicator result" style="position: absolute; top: 8px; left: 8px;">OUTPUT</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="details-stats">
                    <div class="stat-item">
                        <span class="stat-label">Words:</span>
                        <span class="stat-value">${wordCount}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Tokens:</span>
                        <span class="stat-value">${tokenCount}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Complexity:</span>
                        <span class="stat-value">${complexity}/5</span>
                    </div>
                    ${prompt.rating > 0 ? `
                        <div class="stat-item">
                            <span class="stat-label">Rating:</span>
                            <span class="stat-value">${'★'.repeat(prompt.rating)}${'☆'.repeat(5 - prompt.rating)}</span>
                        </div>
                    ` : ''}
                    ${prompt.engine ? `
                        <div class="stat-item">
                            <span class="stat-label">AI Engine:</span>
                            <span class="stat-value">${prompt.engine}</span>
                        </div>
                    ` : ''}
                    ${prompt.usageCount > 0 ? `
                        <div class="stat-item">
                            <span class="stat-label">Usage Count:</span>
                            <span class="stat-value">${prompt.usageCount}</span>
                        </div>
                    ` : ''}
                </div>
                
                ${prompt.tags && prompt.tags.length > 0 ? `
                    <div class="section">
                        <h4><i class="fas fa-tags"></i> Tags</h4>
                        <div class="tags-list">
                            ${prompt.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="details-meta">
                    <div class="meta-item">
                        <i class="far fa-calendar"></i>
                        <span>Created: ${formatDate(prompt.createdAt)}</span>
                    </div>
                    <div class="meta-item">
                        <i class="far fa-calendar-check"></i>
                        <span>Updated: ${formatDate(prompt.updatedAt)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add click handlers for images in the details modal
    modalContent.querySelectorAll('.image-thumb').forEach(img => {
        img.addEventListener('click', () => {
            showImagePreview(img.src, prompt.title);
        });
    });
    
    // Set edit button action
    const editBtn = document.getElementById('editDetailsBtn');
    if (editBtn) {
        editBtn.onclick = () => {
            closeModal('promptDetailsModal');
            editPrompt(prompt.id);
        };
    }
    
    // Set share button action
    const shareBtn = document.getElementById('shareDetailsBtn');
    if (shareBtn) {
        shareBtn.onclick = () => {
            sharePrompt(prompt);
        };
    }
    
    showModal('promptDetailsModal');
}

function sharePrompt(prompt) {
    const shareData = {
        title: prompt.title,
        category: prompt.category,
        content: prompt.content,
        tags: prompt.tags,
        notes: prompt.notes,
        rating: prompt.rating
    };
    
    const encoded = btoa(JSON.stringify(shareData));
    const shareUrl = `${window.location.origin}${window.location.pathname}?shared=${encoded}`;
    
    navigator.clipboard.writeText(shareUrl)
        .then(() => {
            showToast('Share link copied to clipboard!', 'success');
        })
        .catch(() => {
            // Fallback
            prompt('Share URL:', shareUrl);
        });
}

// Favorites
function toggleFavorite(promptId) {
    const index = state.favorites.indexOf(promptId);
    
    if (index === -1) {
        state.favorites.push(promptId);
        showToast('Added to favorites', 'success');
    } else {
        state.favorites.splice(index, 1);
        showToast('Removed from favorites', 'info');
    }
    
    saveState();
    updateStats();
    
    // Update UI if in favorites view
    if (state.currentFilter === 'favorites') {
        renderPrompts();
    }
}

function isFavorite(promptId) {
    return state.favorites.includes(promptId);
}

// Category Management
function showAddCategoryForm() {
    document.getElementById('addCategoryForm').style.display = 'block';
    document.getElementById('newCategoryName').focus();
}

function hideAddCategoryForm() {
    const form = document.getElementById('addCategoryForm');
    if (form) {
        form.style.display = 'none';
    }
    document.getElementById('newCategoryName').value = '';
    document.getElementById('newCategoryParent').value = '';
    document.getElementById('newCategoryColor').value = '#6366f1';
}

function saveNewCategory() {
    const name = document.getElementById('newCategoryName').value.trim();
    const parentId = document.getElementById('newCategoryParent').value;
    const color = document.getElementById('newCategoryColor').value;
    
    if (!name) {
        showToast('Please enter a category name', 'warning');
        return;
    }
    
    // Generate ID based on whether it has a parent
    let id;
    if (parentId) {
        id = `${parentId}-${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
    } else {
        id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    
    if (state.categories.has(id)) {
        showToast('Category already exists', 'warning');
        return;
    }
    
    const category = {
        id,
        name,
        parentId: parentId || null,
        color,
        icon: 'fas fa-folder',
        count: 0,
        createdAt: new Date().toISOString()
    };
    
    state.categories.set(id, category);
    saveCategories();
    
    // Update categories dropdown
    initializeCategoriesDropdown();
    
    // Update category list
    updateCategoryList();
    
    // Hide form
    hideAddCategoryForm();
    
    showToast('Category added', 'success');
}

function editCategory(categoryId) {
    const category = state.categories.get(categoryId);
    if (!category) return;
    
    const newName = prompt('Edit category name:', category.name);
    if (!newName || newName.trim() === category.name) return;
    
    const newId = newName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    if (state.categories.has(newId) && newId !== categoryId) {
        showToast('Category name already exists', 'warning');
        return;
    }
    
    // Update category
    category.name = newName.trim();
    category.id = newId;
    
    // Update all prompts with this category
    state.prompts.forEach(prompt => {
        if (prompt.category === categoryId) {
            prompt.category = newId;
        }
    });
    
    // Save changes
    state.categories.delete(categoryId);
    state.categories.set(newId, category);
    
    saveState();
    saveCategories();
    
    // Update UI
    initializeCategoriesDropdown();
    updateCategoryList();
    renderPrompts();
    
    showToast('Category updated', 'success');
}

function deleteCategory(categoryId) {
    // Don't allow deletion of default categories
    if (Object.keys(DEFAULT_CATEGORIES).includes(categoryId)) {
        showToast('Cannot delete default categories', 'warning');
        return;
    }
    
    showConfirmModal(
        'Delete Category',
        'Are you sure you want to delete this category? All prompts in this category will be moved to "Other".',
        () => {
            // Move prompts to "other" category
            state.prompts.forEach(prompt => {
                if (prompt.category === categoryId) {
                    prompt.category = 'other';
                }
            });
            
            // Remove category
            state.categories.delete(categoryId);
            
            // Save changes
            saveState();
            saveCategories();
            
            // Update UI
            initializeCategoriesDropdown();
            updateCategoryList();
            updateCategoryCounts();
            renderPrompts();
            
            showToast('Category deleted', 'success');
        }
    );
}

function filterByCategory(categoryId) {
    // Remove active class from all categories and sub-categories
    document.querySelectorAll('.category-item, .subcategory-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to selected category (could be main or sub)
    const selectedItem = document.querySelector(`[data-category="${categoryId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }
    
    // Update current filter
    state.currentFilter = 'category';
    state.currentPage = 1;
    
    // Re-render prompts
    renderPrompts();
}

// Bulk Operations
function toggleSelectAll() {
    const filteredPrompts = getFilteredPrompts();
    const allSelected = filteredPrompts.every(p => state.selectedPrompts.has(p.id));
    
    if (allSelected) {
        // Deselect all
        filteredPrompts.forEach(p => state.selectedPrompts.delete(p.id));
    } else {
        // Select all
        filteredPrompts.forEach(p => state.selectedPrompts.add(p.id));
    }
    
    renderPrompts();
    updateBulkDeleteButton();
}

function togglePromptSelection(promptId) {
    if (state.selectedPrompts.has(promptId)) {
        state.selectedPrompts.delete(promptId);
    } else {
        state.selectedPrompts.add(promptId);
    }
    
    renderPrompts();
    updateBulkDeleteButton();
}

function updateBulkDeleteButton() {
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    const compareBtn = document.getElementById('compareBtn');
    
    if (bulkDeleteBtn) {
        if (state.selectedPrompts.size > 0) {
            bulkDeleteBtn.style.display = 'inline-flex';
            bulkDeleteBtn.innerHTML = `<i class="fas fa-trash"></i> Delete Selected (${state.selectedPrompts.size})`;
        } else {
            bulkDeleteBtn.style.display = 'none';
        }
    }
    
    // Show compare button only when exactly 2 prompts are selected
    if (compareBtn) {
        if (state.selectedPrompts.size === 2) {
            compareBtn.style.display = 'inline-flex';
        } else {
            compareBtn.style.display = 'none';
        }
    }
}

function deleteSelectedPrompts() {
    if (state.selectedPrompts.size === 0) return;
    
    showConfirmModal(
        'Delete Selected Prompts',
        `Are you sure you want to delete ${state.selectedPrompts.size} selected prompt(s)? This action cannot be undone.`,
        () => {
            // Remove selected prompts
            state.prompts = state.prompts.filter(p => !state.selectedPrompts.has(p.id));
            
            // Remove from favorites
            state.favorites = state.favorites.filter(id => !state.selectedPrompts.has(id));
            
            // Clear selection
            state.selectedPrompts.clear();
            
            // Save state
            saveState();
            
            // Update UI
            updateCategoryCounts();
            updateStats();
            renderPrompts();
            updateBulkDeleteButton();
            
            showToast(`Deleted ${state.selectedPrompts.size} prompt(s)`, 'success');
        }
    );
}

function showBulkEditModal() {
    showToast('Bulk edit feature coming soon!', 'info');
}

function findDuplicatePrompts() {
    const duplicates = [];
    const seenContent = new Map();
    
    state.prompts.forEach(prompt => {
        const contentHash = prompt.content.substring(0, 100).toLowerCase();
        if (seenContent.has(contentHash)) {
            duplicates.push({
                prompt1: seenContent.get(contentHash),
                prompt2: prompt,
                similarity: 'High'
            });
        } else {
            seenContent.set(contentHash, prompt);
        }
    });
    
    if (duplicates.length === 0) {
        showToast('No duplicates found', 'info');
    } else {
        showToast(`Found ${duplicates.length} possible duplicate(s)`, 'warning');
        console.log('Duplicates:', duplicates);
    }
}

function clearAllCaches() {
    showConfirmModal(
        'Clear All Caches',
        'Are you sure you want to clear all caches? This will improve performance but search suggestions will be reset.',
        () => {
            state.imageCache.clear();
            showToast('All caches cleared', 'success');
        }
    );
}

function createBackup() {
    handleExport(); // Use export function for backup
}

function clearSearch() {
    if (elements.searchInput) {
        elements.searchInput.value = '';
        state.searchQuery = '';
        updateSearchSuggestions();
        renderPrompts();
    }
}

// UI Updates
function updateUI() {
    updateStats();
    updateCategoryList();
    updateViewControls();
    updateSearchSuggestions();
}

function updateStats() {
    // Update sidebar stats
    if (elements.totalPrompts) {
        elements.totalPrompts.textContent = state.prompts.length;
    }
    
    if (elements.totalFavorites) {
        elements.totalFavorites.textContent = state.favorites.length;
    }
    
    if (elements.totalCategories) {
        elements.totalCategories.textContent = state.categories.size;
    }
    
    if (elements.promptsToday) {
        const today = new Date().toDateString();
        const todayCount = state.prompts.filter(p => 
            new Date(p.createdAt).toDateString() === today
        ).length;
        elements.promptsToday.textContent = todayCount;
    }
    
    // Update filter counts
    updateFilterCounts();
    
    // Update main stats bar
    updateStatsBar();
}

function updateFilterCounts() {
    // All prompts
    document.getElementById('countAll').textContent = state.prompts.length;
    
    // Favorites
    document.getElementById('countFavorites').textContent = state.favorites.length;
    
    // Recent (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentCount = state.prompts.filter(p => 
        new Date(p.createdAt) > weekAgo
    ).length;
    document.getElementById('countRecent').textContent = recentCount;
    
    // With images
    const withImagesCount = state.prompts.filter(p => 
        p.images && p.images.length > 0
    ).length;
    document.getElementById('countImages').textContent = withImagesCount;
}

function updateStatsBar() {
    const filteredPrompts = getFilteredPrompts();
    
    if (elements.showingCount && elements.totalCount) {
        elements.showingCount.textContent = filteredPrompts.length;
        elements.totalCount.textContent = state.prompts.length;
    }
    
    if (elements.totalWords) {
        const totalWords = filteredPrompts.reduce((sum, p) => 
            sum + calculateWordCount(p.content), 0
        );
        elements.totalWords.textContent = totalWords.toLocaleString();
    }
    
    if (elements.totalTokens) {
        const totalTokens = filteredPrompts.reduce((sum, p) => 
            sum + estimateTokenCount(p.content), 0
        );
        elements.totalTokens.textContent = totalTokens.toLocaleString();
    }
}

function updateCategoryCounts() {
    // Reset all counts
    state.categories.forEach(cat => cat.count = 0);
    
    // Count prompts per category
    state.prompts.forEach(prompt => {
        const category = state.categories.get(prompt.category);
        if (category) {
            category.count++;
        }
    });
    
    saveCategories();
    updateCategoryList();
}

function updateCategoryList() {
    if (!elements.categoryList) return;
    
    elements.categoryList.innerHTML = '';
    
    // Add default categories first
    const defaultCategories = ['art', 'writing', 'code', 'analysis', 'creative', 'other'];
    const otherCategories = Array.from(state.categories.entries())
        .filter(([id]) => !defaultCategories.includes(id))
        .sort((a, b) => a[1].name.localeCompare(b[1].name));
    
    // Render categories
    [...defaultCategories, ...otherCategories.map(([id]) => id)].forEach(categoryId => {
        const category = state.categories.get(categoryId);
        if (!category) return;
        
        const item = document.createElement('div');
        item.className = 'category-item';
        item.dataset.category = categoryId;
        
        item.innerHTML = `
            <div class="category-name">
                <span class="category-badge" style="background: ${category.color}"></span>
                <span>${category.name}</span>
            </div>
            <span class="category-count">${category.count}</span>
            <div class="category-actions">
                <button class="btn-icon small edit-category-btn" title="Edit category">
                    <i class="fas fa-edit"></i>
                </button>
                ${!defaultCategories.includes(categoryId) ? `
                    <button class="btn-icon small delete-category-btn" title="Delete category">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        `;
        
        // Add event listeners
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.category-actions')) {
                filterByCategory(categoryId);
            }
        });
        
        const editBtn = item.querySelector('.edit-category-btn');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                editCategory(categoryId);
            });
        }
        
        const deleteBtn = item.querySelector('.delete-category-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteCategory(categoryId);
            });
        }
        
        elements.categoryList.appendChild(item);
    });
}

function updateSearchSuggestions() {
    if (!elements.searchSuggestions) return;
    
    const query = state.searchQuery.toLowerCase();
    if (query.length < 2) {
        elements.searchSuggestions.classList.remove('active');
        return;
    }
    
    const suggestions = new Set();
    
    // Search in prompts
    state.prompts.forEach(prompt => {
        if (prompt.title.toLowerCase().includes(query)) {
            suggestions.add(prompt.title);
        }
        if (prompt.tags) {
            prompt.tags.forEach(tag => {
                if (tag.toLowerCase().includes(query)) {
                    suggestions.add(`Tag: ${tag}`);
                }
            });
        }
        if (prompt.content.toLowerCase().includes(query)) {
            // Extract matching sentence
            const sentences = prompt.content.split(/[.!?]+/);
            const matchingSentence = sentences.find(s => 
                s.toLowerCase().includes(query)
            );
            if (matchingSentence) {
                suggestions.add(matchingSentence.trim().substring(0, 50) + '...');
            }
        }
    });
    
    // Search in categories
    state.categories.forEach(category => {
        if (category.name.toLowerCase().includes(query)) {
            suggestions.add(`Category: ${category.name}`);
        }
    });
    
    const suggestionsArray = Array.from(suggestions).slice(0, 8);
    
    if (suggestionsArray.length > 0) {
        elements.searchSuggestions.innerHTML = suggestionsArray.map(suggestion => `
            <div class="suggestion-item">${escapeHtml(suggestion)}</div>
        `).join('');
        elements.searchSuggestions.classList.add('active');
        
        // Add click listeners
        elements.searchSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const text = item.textContent.replace(/^(Tag:|Category:)\s*/, '');
                elements.searchInput.value = text;
                handleSearch({ target: elements.searchInput });
            });
        });
    } else {
        elements.searchSuggestions.classList.remove('active');
    }
}

function navigateSuggestions(direction) {
    const suggestions = document.getElementById('searchSuggestions');
    const items = suggestions.querySelectorAll('.suggestion-item');
    if (items.length === 0) return;
    
    const current = suggestions.querySelector('.suggestion-item.highlighted');
    let nextIndex = 0;
    
    if (current) {
        const currentIndex = Array.from(items).indexOf(current);
        nextIndex = currentIndex + direction;
        
        // Wrap around
        if (nextIndex < 0) nextIndex = items.length - 1;
        if (nextIndex >= items.length) nextIndex = 0;
        
        current.classList.remove('highlighted');
    }
    
    items[nextIndex].classList.add('highlighted');
    items[nextIndex].scrollIntoView({ block: 'nearest' });
}

function updateShowingCount(showing, total) {
    if (elements.showingCount && elements.totalCount) {
        elements.showingCount.textContent = showing;
        elements.totalCount.textContent = total;
    }
}

function showEmptyState() {
    if (!elements.promptsContainer) return;
    
    let message = '';
    let action = '';
    
    if (state.searchQuery) {
        message = `No prompts found for "${state.searchQuery}"`;
        action = 'Try a different search term or clear search';
    } else if (state.currentFilter === 'favorites') {
        message = 'No favorite prompts yet';
        action = 'Add some prompts to your favorites first';
    } else {
        message = 'Your Prompt Library is Empty';
        action = 'Start by adding your first AI prompt';
    }
    
    elements.promptsContainer.innerHTML = `
        <div class="empty-state">
            <div class="empty-illustration">
                <i class="fas fa-comment-alt"></i>
            </div>
            <h3>${message}</h3>
            <p>${action}</p>
            <div class="empty-actions">
                ${state.searchQuery ? `
                    <button id="clearSearchEmptyBtn" class="btn btn-outline">
                        <i class="fas fa-times"></i> Clear Search
                    </button>
                ` : ''}
                <button id="addPromptEmptyBtn" class="btn btn-primary">
                    <i class="fas fa-plus-circle"></i> Add New Prompt
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners to empty state buttons
    const clearBtn = document.getElementById('clearSearchEmptyBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearSearch);
    }
    
    const addBtn = document.getElementById('addPromptEmptyBtn');
    if (addBtn) {
        addBtn.addEventListener('click', showAddPromptModal);
    }
    
    // Update pagination
    document.getElementById('pagination').style.display = 'none';
}

function updateViewControls() {
    // Update view buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.getElementById(`${state.currentView}ViewBtn`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

// Form Handling
function resetPromptForm() {
    const form = document.getElementById('promptForm');
    if (form) {
        form.reset();
    }
    
    // Reset tags
    const tagsContainer = document.getElementById('tagsContainer');
    if (tagsContainer) {
        tagsContainer.innerHTML = '';
    }
    
    // Reset images
    document.querySelectorAll('.image-upload-card').forEach(card => {
        removeImage(card);
    });
    
    // Reset result images to just one
    const imagesGrid = document.getElementById('imagesGrid');
    if (imagesGrid) {
        const resultCards = imagesGrid.querySelectorAll('.image-upload-card[data-type="result"]');
        // Keep only the first result card
        for (let i = 1; i < resultCards.length; i++) {
            resultCards[i].remove();
        }
        
        // Reset the "Add more" button
        const addMoreBtn = document.getElementById('addResultImageBtn');
        if (addMoreBtn) {
            addMoreBtn.querySelector('span').textContent = 'Add Result Image';
            addMoreBtn.style.opacity = '1';
            addMoreBtn.style.cursor = 'pointer';
        }
    }
    
    // Clear image cache for this form
    Array.from(state.imageCache.keys()).forEach(key => {
        if (key.startsWith('image-')) {
            state.imageCache.delete(key);
        }
    });
    
    // Reset rating
    updateRatingStars(0);
    
    // Reset character count
    updateCharCount();
    
    // Reset hidden ID
    document.getElementById('promptId').value = '';
}

function loadTags(tags) {
    const container = document.getElementById('tagsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    tags.forEach(tag => {
        const tagEl = document.createElement('span');
        tagEl.className = 'tag-input';
        tagEl.innerHTML = `
            ${escapeHtml(tag)}
            <button class="remove-tag" type="button">&times;</button>
        `;
        container.appendChild(tagEl);
    });
    
    // Add remove listeners
    container.querySelectorAll('.remove-tag').forEach(btn => {
        btn.addEventListener('click', function() {
            this.parentElement.remove();
        });
    });
}

function updateCharCount() {
    const textarea = document.getElementById('promptText');
    const charCount = document.getElementById('charCount');
    const wordCount = document.getElementById('wordCount');
    const tokenCount = document.getElementById('tokenCount');
    
    if (!textarea || !charCount) return;
    
    const text = textarea.value;
    const chars = text.length;
    const words = calculateWordCount(text);
    const tokens = estimateTokenCount(text);
    
    charCount.textContent = chars;
    if (wordCount) wordCount.textContent = words;
    if (tokenCount) tokenCount.textContent = tokens;
}

function updateRatingStars(rating) {
    const stars = document.querySelectorAll('#ratingStars .star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
            star.innerHTML = '<i class="fas fa-star"></i>';
        } else {
            star.classList.remove('active');
            star.innerHTML = '<i class="far fa-star"></i>';
        }
    });
    
    // Update rating label
    const label = document.getElementById('ratingLabel');
    if (label) {
        label.textContent = rating === 0 ? 'Not rated' : `${rating}/5`;
    }
}

// Setup rating stars interaction
function setupRatingStars() {
    const stars = document.querySelectorAll('#ratingStars .star');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const rating = parseInt(star.dataset.value);
            document.getElementById('promptRating').value = rating;
            updateRatingStars(rating);
        });
        
        star.addEventListener('mouseover', () => {
            const rating = parseInt(star.dataset.value);
            const stars = document.querySelectorAll('#ratingStars .star');
            stars.forEach((s, index) => {
                if (index < rating) {
                    s.innerHTML = '<i class="fas fa-star"></i>';
                } else {
                    s.innerHTML = '<i class="far fa-star"></i>';
                }
            });
        });
        
        star.addEventListener('mouseout', () => {
            const currentRating = parseInt(document.getElementById('promptRating').value) || 0;
            updateRatingStars(currentRating);
        });
    });
}

// Filtering and Sorting
function getFilteredPrompts() {
    let filtered = [...state.prompts];
    
    // Apply search filter
    if (state.searchQuery) {
        filtered = filtered.filter(prompt => 
            prompt.title.toLowerCase().includes(state.searchQuery) ||
            prompt.content.toLowerCase().includes(state.searchQuery) ||
            (prompt.tags && prompt.tags.some(tag => 
                tag.toLowerCase().includes(state.searchQuery)
            )) ||
            (prompt.notes && prompt.notes.toLowerCase().includes(state.searchQuery))
        );
    }
    
    // Apply category filter
    if (state.currentFilter === 'category') {
        const activeCategory = document.querySelector('.category-item.active')?.dataset.category || 
                              document.querySelector('.subcategory-item.active')?.dataset.category;
        if (activeCategory) {
            const category = state.categories.get(activeCategory);
            if (category) {
                if (category.parentId) {
                    // This is a sub-category, filter exactly
                    filtered = filtered.filter(prompt => prompt.category === activeCategory);
                } else {
                    // This is a main category, include sub-categories too
                    const subCategoryIds = Array.from(state.categories.values())
                        .filter(cat => cat.parentId === activeCategory)
                        .map(cat => cat.id);
                    
                    filtered = filtered.filter(prompt => 
                        prompt.category === activeCategory || 
                        subCategoryIds.includes(prompt.category)
                    );
                }
            }
        }
    }
    
    // Apply other filters
    switch (state.currentFilter) {
        case 'favorites':
            filtered = filtered.filter(prompt => state.favorites.includes(prompt.id));
            break;
        case 'recent':
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            filtered = filtered.filter(prompt => 
                new Date(prompt.createdAt) > weekAgo
            );
            break;
        case 'withImages':
            filtered = filtered.filter(prompt => 
                prompt.images && prompt.images.length > 0
            );
            break;
        // 'all' filter - no additional filtering needed
    }
    
    return filtered;
}

function sortPrompts(prompts) {
    const sorted = [...prompts];
    
    switch (state.currentSort) {
        case 'newest':
            sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'oldest':
            sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'title':
            sorted.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'rating':
            sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            break;
        case 'complexity':
            sorted.sort((a, b) => (b.complexity || 0) - (a.complexity || 0));
            break;
        case 'custom':
            sorted.sort((a, b) => {
                const orderA = state.customOrder.indexOf(a.id);
                const orderB = state.customOrder.indexOf(b.id);
                // Prompts not in custom order go to the end
                const posA = orderA === -1 ? 99999 : orderA;
                const posB = orderB === -1 ? 99999 : orderB;
                return posA - posB;
            });
            break;
    }
    
    return sorted;
}

function paginatePrompts(prompts) {
    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = startIndex + state.pageSize;
    return prompts.slice(startIndex, endIndex);
}

function updatePagination(totalItems) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(totalItems / state.pageSize);
    
    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    
    // Update buttons
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if (prevBtn) {
        prevBtn.disabled = state.currentPage === 1;
        prevBtn.onclick = () => {
            if (state.currentPage > 1) {
                state.currentPage--;
                renderPrompts();
            }
        };
    }
    
    if (nextBtn) {
        nextBtn.disabled = state.currentPage === totalPages;
        nextBtn.onclick = () => {
            if (state.currentPage < totalPages) {
                state.currentPage++;
                renderPrompts();
            }
        };
    }
    
    // Update page numbers
    const pageNumbers = document.getElementById('pageNumbers');
    if (!pageNumbers) return;
    
    pageNumbers.innerHTML = '';
    
    // Calculate page range to show (max 5 pages)
    let startPage = Math.max(1, state.currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    // Adjust start if we're near the end
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-number ${i === state.currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
            state.currentPage = i;
            renderPrompts();
        });
        pageNumbers.appendChild(pageBtn);
    }
    
    // Add ellipsis if needed
    if (endPage < totalPages) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'page-ellipsis';
        ellipsis.textContent = '...';
        pageNumbers.appendChild(ellipsis);
        
        const lastPage = document.createElement('button');
        lastPage.className = 'page-number';
        lastPage.textContent = totalPages;
        lastPage.addEventListener('click', () => {
            state.currentPage = totalPages;
            renderPrompts();
        });
        pageNumbers.appendChild(lastPage);
    }
}

// View Management
function setViewMode(mode) {
    state.currentView = mode;
    
    // Update container class
    if (elements.promptsContainer) {
        elements.promptsContainer.className = `prompts-container ${mode}-view`;
    }
    
    // Update active button
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.getElementById(`${mode}ViewBtn`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Update settings
    state.settings.compactMode = (mode === 'compact');
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
    
    // Re-render prompts
    renderPrompts();
}

// Modal Management
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus first input if exists
        const firstInput = modal.querySelector('input, textarea, select');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

function showConfirmModal(title, message, callback) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    
    state.pendingConfirmAction = callback;
    showModal('confirmModal');
}

function setupModalEvents() {
    // Close modal on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });
    });
    
    // Close modal buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });
    });
    
    // Confirm modal actions
    document.getElementById('confirmCancel')?.addEventListener('click', () => {
        closeModal('confirmModal');
    });
    
    document.getElementById('confirmOk')?.addEventListener('click', () => {
        if (state.pendingConfirmAction) {
            state.pendingConfirmAction();
            state.pendingConfirmAction = null;
        }
        closeModal('confirmModal');
    });
    
    // Prompt form submission
    const promptForm = document.getElementById('promptForm');
    if (promptForm) {
        promptForm.addEventListener('submit', savePrompt);
    }
    
    // Reset form button
    document.getElementById('resetFormBtn')?.addEventListener('click', resetPromptForm);
    
    // Tags input
    const tagsInput = document.getElementById('promptTags');
    if (tagsInput) {
        tagsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const tag = tagsInput.value.trim();
                if (tag) {
                    addTag(tag);
                    tagsInput.value = '';
                }
            }
        });
    }
    
    // Character count for prompt text
    const promptText = document.getElementById('promptText');
    if (promptText) {
        promptText.addEventListener('input', updateCharCount);
    }
    
    // Rating stars
    setupRatingStars();
    
    // Advanced section toggle
    const toggleHeader = document.getElementById('toggleAdvanced');
    if (toggleHeader) {
        toggleHeader.addEventListener('click', () => {
            const content = document.getElementById('advancedContent');
            const icon = toggleHeader.querySelector('i');
            
            if (content.style.display === 'none') {
                content.style.display = 'block';
                icon.style.transform = 'rotate(180deg)';
            } else {
                content.style.display = 'none';
                icon.style.transform = 'rotate(0deg)';
            }
        });
    }
}

function addTag(tagName) {
    const container = document.getElementById('tagsContainer');
    if (!container) return;
    
    // Check if tag already exists
    const existingTags = Array.from(container.querySelectorAll('.tag-input'))
        .map(el => el.textContent.replace('×', '').trim());
    
    if (existingTags.includes(tagName)) {
        showToast('Tag already exists', 'warning');
        return;
    }
    
    const tagEl = document.createElement('span');
    tagEl.className = 'tag-input';
    tagEl.innerHTML = `
        ${escapeHtml(tagName)}
        <button class="remove-tag" type="button">&times;</button>
    `;
    
    // Add remove listener
    const removeBtn = tagEl.querySelector('.remove-tag');
    removeBtn.addEventListener('click', function() {
        this.parentElement.remove();
    });
    
    container.appendChild(tagEl);
}

// Image Preview
function showImagePreview(src, title) {
    const img = document.getElementById('previewImage');
    const titleEl = document.getElementById('imagePreviewTitle');
    
    if (img) img.src = src;
    if (titleEl) titleEl.textContent = title;
    // reset transform/scale
    if (img) {
        img.style.transform = 'scale(1)';
        img.dataset.scale = '1';
    }

    showModal('imagePreviewModal');
}

// Setup image preview behaviors: zoom in/out, wheel zoom, double-click toggle, reset on close
function setupImagePreview() {
    const modal = document.getElementById('imagePreviewModal');
    const img = document.getElementById('previewImage');
    if (!modal || !img) return;

    // Add zoom controls to header if not present
    const header = modal.querySelector('.modal-header');
    if (header && !header.querySelector('.zoom-controls')) {
        const controls = document.createElement('div');
        controls.className = 'zoom-controls';
        controls.innerHTML = `
            <button type="button" class="zoom-btn" id="zoomOutBtn" title="Zoom out">−</button>
            <button type="button" class="zoom-btn" id="zoomInBtn" title="Zoom in">+</button>
            <button type="button" class="zoom-btn" id="resetZoomBtn" title="Reset">Reset</button>
        `;
        header.appendChild(controls);

        // Button events
        controls.querySelector('#zoomInBtn').addEventListener('click', () => adjustScale(1.25));
        controls.querySelector('#zoomOutBtn').addEventListener('click', () => adjustScale(1 / 1.25));
        controls.querySelector('#resetZoomBtn').addEventListener('click', () => setScale(1));
    }

    // scale state
    function getScale() { return parseFloat(img.dataset.scale || '1'); }
    function setScale(s) {
        const clamped = Math.max(0.2, Math.min(5, s));
        img.dataset.scale = String(clamped);
        img.style.transform = `scale(${clamped})`;
        img.style.cursor = clamped > 1 ? 'grab' : 'zoom-in';
    }
    function adjustScale(factor) { setScale(getScale() * factor); }

    // Wheel zoom
    modal.addEventListener('wheel', (e) => {
        if (!modal.classList.contains('active')) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        adjustScale(delta);
    }, { passive: false });

    // Double-click to toggle between fit (1) and 2x
    img.addEventListener('dblclick', () => {
        setScale(getScale() > 1 ? 1 : 2);
    });

    // Panning (drag to move) when zoomed with bounds
    let isPanning = false;
    let startX = 0, startY = 0;
    let startTx = 0, startTy = 0;
    const container = modal.querySelector('.image-preview-container');
    let maxOffsetX = 0, maxOffsetY = 0;

    function getTranslate() {
        return {
            x: parseFloat(img.dataset.tx || '0'),
            y: parseFloat(img.dataset.ty || '0')
        };
    }

    function setTranslate(x, y) {
        // clamp
        const clampedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, x));
        const clampedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, y));
        img.dataset.tx = String(clampedX);
        img.dataset.ty = String(clampedY);
        const s = getScale();
        img.style.transform = `translate(${clampedX}px, ${clampedY}px) scale(${s})`;
    }

    function updateBounds() {
        if (!container) return;
        // use current rendered size of image (without translate) to compute overflow
        const cRect = container.getBoundingClientRect();
        // temporarily apply scale to get image size
        const s = getScale();
        // natural size fallback
        const naturalW = img.naturalWidth || cRect.width;
        const naturalH = img.naturalHeight || cRect.height;
        // Compute rendered image size while respecting object-fit:contain behavior
        const aspectImg = naturalW / naturalH;
        const aspectContainer = cRect.width / cRect.height;
        let renderedW, renderedH;
        if (aspectImg > aspectContainer) {
            renderedW = cRect.width * s;
            renderedH = (cRect.width / aspectImg) * s;
        } else {
            renderedH = cRect.height * s;
            renderedW = (cRect.height * aspectImg) * s;
        }

        maxOffsetX = Math.max(0, (renderedW - cRect.width) / 2);
        maxOffsetY = Math.max(0, (renderedH - cRect.height) / 2);
        // ensure current translate is within bounds
        const t = getTranslate();
        setTranslate(t.x, t.y);
    }

    // update setScale to preserve translate unless resetting to 1
    const origSetScale = setScale;
    setScale = function(s) {
        const prev = getScale();
        origSetScale(s);
        if (s === 1) {
            img.dataset.tx = '0';
            img.dataset.ty = '0';
            img.style.transform = `scale(1)`;
        }
        // recalc bounds after scale change
        updateBounds();
        img.style.cursor = parseFloat(img.dataset.scale || '1') > 1 ? 'grab' : 'zoom-in';
    };

    img.addEventListener('pointerdown', (e) => {
        if (getScale() <= 1) return;
        updateBounds();
        isPanning = true;
        startX = e.clientX;
        startY = e.clientY;
        const t = getTranslate();
        startTx = t.x;
        startTy = t.y;
        img.setPointerCapture(e.pointerId);
        img.style.cursor = 'grabbing';
    });

    img.addEventListener('pointermove', (e) => {
        if (!isPanning) return;
        e.preventDefault();
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        // apply a small damping factor so movement feels less loose
        const damp = 30;
        setTranslate(startTx + dx * damp, startTy + dy * damp);
    });

    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => {
        img.addEventListener(ev, (e) => {
            if (!isPanning) return;
            isPanning = false;
            try { img.releasePointerCapture && img.releasePointerCapture(e.pointerId); } catch (err) {}
            img.style.cursor = parseFloat(img.dataset.scale || '1') > 1 ? 'grab' : 'zoom-in';
        });
    });

    // Reset when modal closed via any close control
    modal.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => setScale(1));
    });

    // Also reset when clicking outside (setupModalEvents closes modal on backdrop click)
    modal.addEventListener('click', (e) => {
        if (e.target === modal) setScale(1);
    });
}

// Toast Notification
function showToast(message, type = 'info', duration = 4000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    // Update toast content
    const titleMap = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Info'
    };
    
    document.getElementById('toastTitle').textContent = titleMap[type] || 'Info';
    document.getElementById('toastMessage').textContent = message;
    
    // Update icon
    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const icon = toast.querySelector('.toast-icon i');
    if (icon) {
        icon.className = `fas ${iconMap[type] || 'fa-info-circle'}`;
    }
    
    // Set type class
    toast.className = 'toast';
    toast.classList.add(type);
    
    // Show toast
    toast.classList.add('show');
    
    // Auto-hide
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
    
    // Close button
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
        closeBtn.onclick = () => toast.classList.remove('show');
    }
}

// Loading State
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('active', show);
    }
}

// Theme Management
function toggleTheme() {
    const newTheme = state.settings.theme === 'light' ? 'dark' : 'light';
    state.settings.theme = newTheme;
    
    // Update UI
    updateTheme();
    
    // Save settings
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
    
    showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`, 'info');
}

function updateTheme() {
    document.documentElement.setAttribute('data-theme', state.settings.theme);
    
    // Update theme toggle icon
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        if (icon) {
            icon.className = state.settings.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
}

// Keyboard Shortcuts
function handleKeyboardShortcuts(event) {
    // Don't trigger shortcuts when typing in inputs
    if (event.target.tagName === 'INPUT' || 
        event.target.tagName === 'TEXTAREA' ||
        event.target.isContentEditable) {
        return;
    }
    
    // Ctrl/Cmd + N: New prompt
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        showAddPromptModal();
    }
    
    // Ctrl/Cmd + F: Focus search
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        elements.searchInput?.focus();
    }
    
    // Ctrl/Cmd + S: Save (shows toast)
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        showToast('Auto-save is enabled', 'info');
    }
    
    // Escape: Close modals
    if (event.key === 'Escape') {
        const openModal = document.querySelector('.modal.active');
        if (openModal) {
            openModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }
    
    // Arrow keys in search suggestions
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const suggestions = document.getElementById('searchSuggestions');
        if (suggestions && suggestions.classList.contains('active')) {
            event.preventDefault();
            navigateSuggestions(event.key === 'ArrowDown' ? 1 : -1);
        }
    }
    
    // Enter to select suggestion
    if (event.key === 'Enter') {
        const suggestions = document.getElementById('searchSuggestions');
        const highlighted = suggestions?.querySelector('.suggestion-item.highlighted');
        if (highlighted) {
            event.preventDefault();
            highlighted.click();
        }
    }
}

// Window Events
function handleBeforeUnload() {
    // Save state before leaving
    saveState();
}

// Utility Functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString, format = 'MMM DD, YYYY') {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${month} ${day}, ${year}`;
}

function calculateWordCount(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function estimateTokenCount(text) {
    if (!text) return 0;
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
}

function calculateComplexity(prompt) {
    const wordCount = calculateWordCount(prompt.content);
    const hasNotes = prompt.notes && prompt.notes.length > 50;
    const hasImages = prompt.images && prompt.images.length > 0;
    const tagCount = prompt.tags ? prompt.tags.length : 0;
    
    let score = 1;
    if (wordCount > 100) score += 1;
    if (wordCount > 200) score += 1;
    if (hasNotes) score += 1;
    if (hasImages) score += 1;
    if (tagCount >= 3) score += 1;
    
    return Math.min(score, 5);
}

function getCategoryColor(categoryId) {
    const category = state.categories.get(categoryId);
    return category ? category.color : '#6c757d';
}

function getCategoryIcon(categoryId) {
    const category = state.categories.get(categoryId);
    return category ? category.icon : 'fas fa-folder';
}

function getCategoryName(categoryId) {
    const category = state.categories.get(categoryId);
    return category ? category.name : 'Other';
}

function generateRandomColor() {
    const colors = [
        '#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#7209b7',
        '#3a86ff', '#fb5607', '#8338ec', '#ff006e', '#ffbe0b',
        '#3a86ff', '#ff5d8f', '#90be6d', '#f9c74f', '#43aa8b',
        '#577590', '#f94144', '#f3722c', '#f8961e', '#f9844a'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Sample Data
function addSampleData() {
    const samplePrompts = [
        {
            id: generateId(),
            serialNumber: 1,
            title: "Fantasy Landscape Generator",
            category: "art",
            content: "Create a breathtaking fantasy landscape with towering mountains, mystical forests, and a crystal-clear river flowing through a magical valley. Digital painting style, highly detailed, epic scale, cinematic lighting, 8K resolution, trending on ArtStation.",
            tags: ["fantasy", "landscape", "digital painting", "detailed", "epic"],
            images: [],
            notes: "Works best with DALL-E 3 or Midjourney v6. Use --ar 16:9 for widescreen. Add --style raw for more creative control.",
            rating: 5,
            engine: "Midjourney",
            complexity: 4,
            usageCount: 12,
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];
    
    state.prompts = samplePrompts;
    
    // Add some to favorites
    state.favorites = [samplePrompts[0].id];
    
    saveState();
    console.log('📝 Sample data added');
}

// Error Handling
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    showToast('An error occurred. Check console for details.', 'error');
});

// Make app available globally for debugging
if (typeof window !== 'undefined') {
    window.promptVault = {
        state,
        utils: {
            generateId,
            calculateWordCount,
            estimateTokenCount,
            formatDate
        },
        actions: {
            showAddPromptModal,
            importSampleData,
            exportData: handleExport,
            clearAllData: () => {
                if (confirm('Clear ALL data? This cannot be undone!')) {
                    localStorage.clear();
                    location.reload();
                }
            }
        }
    };
    
    console.log('🔧 Debug mode enabled: window.promptVault');
}

// Image Upload Functions
function setupImageUploads() {
    // File upload handling
    document.querySelectorAll('.image-input').forEach(input => {
        input.addEventListener('change', handleImageUpload);
    });
    
    // Add more result images button
    const addResultBtn = document.getElementById('addResultImageBtn');
    if (addResultBtn) {
        addResultBtn.addEventListener('click', addResultImageSlot);
    }
    
    // Add image from URL button
    const addUrlBtn = document.getElementById('addImageUrlBtn');
    if (addUrlBtn) {
        addUrlBtn.addEventListener('click', showImageUrlModal);
    }
    
    // Load image from URL
    const loadUrlBtn = document.getElementById('loadImageUrlBtn');
    if (loadUrlBtn) {
        loadUrlBtn.addEventListener('click', loadImageFromUrl);
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file (JPEG, PNG, GIF, etc.)', 'error');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image file is too large (max 5MB)', 'error');
        return;
    }
    
    const reader = new FileReader();
    const imageCard = event.target.closest('.image-upload-card');
    const type = imageCard.dataset.type;
    const index = parseInt(imageCard.dataset.index);
    
    reader.onload = function(e) {
        const imageData = e.target.result;
        const cacheId = `image-${type}-${index}`;
        
        // Cache the image
        state.imageCache.set(cacheId, imageData);
        
        // Display preview
        displayImagePreview(imageCard, imageData);
        
        showToast('Image uploaded successfully', 'success');
    };
    
    reader.onerror = function() {
        showToast('Failed to load image', 'error');
    };
    
    reader.readAsDataURL(file);
}

function displayImagePreview(imageCard, imageData) {
    if (!imageCard || !imageData) return;
    
    const placeholder = imageCard.querySelector('.image-upload-placeholder');
    const previewContainer = imageCard.querySelector('.image-preview-container');
    const removeBtn = imageCard.querySelector('.remove-image');
    
    // Hide placeholder
    if (placeholder) {
        placeholder.style.display = 'none';
    }
    
    // Create or update preview
    let img = previewContainer.querySelector('img');
    if (!img) {
        img = document.createElement('img');
        previewContainer.appendChild(img);
    }
    
    // Set image source with error handling
    img.src = imageData;
    img.alt = 'Preview';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.borderRadius = 'var(--border-radius)';
    
    img.onload = function() {
        // Show preview container
        previewContainer.style.display = 'block';
        
        // Show remove button
        if (removeBtn) {
            removeBtn.style.display = 'flex';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                removeImage(imageCard);
            };
        }
        
        // Update card state
        imageCard.classList.add('has-image');
    };
    
    img.onerror = function() {
        console.error('Failed to load preview image');
        showToast('Failed to load image preview', 'error');
        
        // Reset card if image fails to load
        if (placeholder) placeholder.style.display = 'block';
        previewContainer.style.display = 'none';
        if (removeBtn) removeBtn.style.display = 'none';
        imageCard.classList.remove('has-image');
    };
}

function removeImage(imageCard) {
    const type = imageCard.dataset.type;
    const index = parseInt(imageCard.dataset.index);
    const cacheId = `image-${type}-${index}`;
    
    // Remove from cache
    state.imageCache.delete(cacheId);
    
    // Reset card
    const placeholder = imageCard.querySelector('.image-upload-placeholder');
    const previewContainer = imageCard.querySelector('.image-preview-container');
    const removeBtn = imageCard.querySelector('.remove-image');
    const fileInput = imageCard.querySelector('input[type="file"]');
    
    // Show placeholder
    if (placeholder) placeholder.style.display = 'block';
    
    // Hide preview
    if (previewContainer) {
        previewContainer.style.display = 'none';
        previewContainer.innerHTML = '';
    }
    
    // Hide remove button
    if (removeBtn) removeBtn.style.display = 'none';
    
    // Reset file input
    if (fileInput) fileInput.value = '';
    
    // Update card state
    imageCard.classList.remove('has-image');
}

function addResultImageSlot() {
    const imagesGrid = document.getElementById('imagesGrid');
    if (!imagesGrid) return;
    
    // Count existing result images
    const resultCards = imagesGrid.querySelectorAll('.image-upload-card[data-type="result"]');
    const nextIndex = resultCards.length;
    
    // Don't add more than 5 result images
    if (nextIndex >= 5) {
        showToast('Maximum 5 result images allowed', 'warning');
        return;
    }
    
    // Create new image card
    const newCard = document.createElement('div');
    newCard.className = 'image-upload-card';
    newCard.dataset.type = 'result';
    newCard.dataset.index = nextIndex;
    
    newCard.innerHTML = `
        <div class="image-upload-placeholder">
            <i class="fas fa-image"></i>
            <span>Result ${nextIndex + 1}</span>
            <small>Example output image</small>
        </div>
        <input type="file" class="image-input" accept="image/*" data-type="result" data-index="${nextIndex}">
        <div class="image-preview-container"></div>
        <button type="button" class="remove-image" style="display: none;">×</button>
    `;
    
    // Insert before the "Add more" button
    const addMoreBtn = document.getElementById('addResultImageBtn');
    imagesGrid.insertBefore(newCard, addMoreBtn);
    
    // Add event listeners
    const fileInput = newCard.querySelector('.image-input');
    fileInput.addEventListener('change', handleImageUpload);
    
    // Update "Add more" button text if needed
    if (nextIndex === 4) {
        addMoreBtn.querySelector('span').textContent = 'Max 5 images';
        addMoreBtn.style.opacity = '0.5';
        addMoreBtn.style.cursor = 'not-allowed';
    }
    
    showToast('New image slot added', 'info');
}

function showImageUrlModal() {
    // Reset form
    document.getElementById('imageUrlInput').value = '';
    document.getElementById('imageTypeSelect').value = 'input';
    
    showModal('imageUrlModal');
}


function processImageData(targetCard, imageData, type) {
    const cardType = targetCard.dataset.type;
    const cardIndex = parseInt(targetCard.dataset.index);
    const cacheId = `image-${cardType}-${cardIndex}`;
    
    // Cache the image
    state.imageCache.set(cacheId, imageData);
    
    // Display preview
    displayImagePreview(targetCard, imageData);
    
    showToast('Image loaded from URL', 'success');
}

// Get images from form when saving prompt
function getFormImages() {
    const images = [];
    
    // Get input images
    const inputCards = document.querySelectorAll('.image-upload-card[data-type="input"]');
    inputCards.forEach(card => {
        if (card.classList.contains('has-image')) {
            const index = parseInt(card.dataset.index);
            const cacheId = `image-input-${index}`;
            const imageData = state.imageCache.get(cacheId);
            
            if (imageData) {
                images.push({
                    type: 'input',
                    url: imageData,
                    index: index
                });
            }
        }
    });
    
    // Get result images
    const resultCards = document.querySelectorAll('.image-upload-card[data-type="result"]');
    resultCards.forEach(card => {
        if (card.classList.contains('has-image')) {
            const index = parseInt(card.dataset.index);
            const cacheId = `image-result-${index}`;
            const imageData = state.imageCache.get(cacheId);
            
            if (imageData) {
                images.push({
                    type: 'result',
                    url: imageData,
                    index: index
                });
            }
        }
    });
    
    return images;
}

// Load images when editing a prompt
function loadPromptImages(images) {
    if (!images || !Array.isArray(images)) return;
    
    // Clear all existing images first
    document.querySelectorAll('.image-upload-card').forEach(card => {
        removeImage(card);
    });
    
    images.forEach(img => {
        const type = img.type;
        const index = img.index || 0;
        
        let targetCard = null;
        
        if (type === 'input') {
            targetCard = document.querySelector('.image-upload-card[data-type="input"]');
        } else {
            const resultCards = document.querySelectorAll('.image-upload-card[data-type="result"]');
            // Find card with matching index or first available
            targetCard = Array.from(resultCards).find(card => 
                parseInt(card.dataset.index) === index
            ) || resultCards[0];
            
            // If no card exists at this index, add one
            if (!targetCard) {
                addResultImageSlot();
                setTimeout(() => {
                    const newCards = document.querySelectorAll('.image-upload-card[data-type="result"]');
                    targetCard = newCards[newCards.length - 1];
                    if (targetCard && img.url) {
                        const cacheId = `image-${type}-${targetCard.dataset.index}`;
                        state.imageCache.set(cacheId, img.url);
                        displayImagePreview(targetCard, img.url);
                    }
                }, 100);
                return;
            }
        }
        
        if (targetCard && img.url) {
            const cacheId = `image-${type}-${targetCard.dataset.index}`;
            state.imageCache.set(cacheId, img.url);
            displayImagePreview(targetCard, img.url);
        }
    });
}

// Add Input Image Slot
function addInputImageSlot() {
    const imagesGrid = document.getElementById('inputImagesGrid');
    if (!imagesGrid) return;
    
    // Count existing input images
    const inputCards = imagesGrid.querySelectorAll('.image-upload-card[data-type="input"]');
    const nextIndex = inputCards.length;
    
    // Don't add more than 3 input images
    if (nextIndex >= 3) {
        showToast('Maximum 3 input images allowed', 'warning');
        return;
    }
    
    // Create new image card
    const newCard = document.createElement('div');
    newCard.className = 'image-upload-card';
    newCard.dataset.type = 'input';
    newCard.dataset.index = nextIndex;
    
    newCard.innerHTML = `
        <div class="image-upload-placeholder">
            <i class="fas fa-upload"></i>
            <span>Input ${nextIndex + 1}</span>
            <small>Example input image</small>
        </div>
        <input type="file" class="image-input" accept="image/*" data-type="input" data-index="${nextIndex}">
        <div class="image-preview-container"></div>
        <button type="button" class="remove-image">×</button>
    `;
    
    // Insert before the "Add more" button
    const addMoreBtn = document.getElementById('addInputImageBtn');
    imagesGrid.insertBefore(newCard, addMoreBtn);
    
    // Add event listeners
    const fileInput = newCard.querySelector('.image-input');
    fileInput.addEventListener('change', handleImageUpload);
    
    // Update "Add more" button text if needed
    if (nextIndex === 2) {
        addMoreBtn.querySelector('span').textContent = 'Max 3 images';
        addMoreBtn.style.opacity = '0.5';
        addMoreBtn.style.cursor = 'not-allowed';
    }
    
    showToast('New input image slot added', 'info');
}

// Add Result Image Slot
function addResultImageSlot() {
    const imagesGrid = document.getElementById('resultImagesGrid');
    if (!imagesGrid) return;
    
    // Count existing result images
    const resultCards = imagesGrid.querySelectorAll('.image-upload-card[data-type="result"]');
    const nextIndex = resultCards.length;
    
    // Don't add more than 5 result images
    if (nextIndex >= 5) {
        showToast('Maximum 5 result images allowed', 'warning');
        return;
    }
    
    // Create new image card
    const newCard = document.createElement('div');
    newCard.className = 'image-upload-card';
    newCard.dataset.type = 'result';
    newCard.dataset.index = nextIndex;
    
    newCard.innerHTML = `
        <div class="image-upload-placeholder">
            <i class="fas fa-image"></i>
            <span>Result ${nextIndex + 1}</span>
            <small>Example output image</small>
        </div>
        <input type="file" class="image-input" accept="image/*" data-type="result" data-index="${nextIndex}">
        <div class="image-preview-container"></div>
        <button type="button" class="remove-image">×</button>
    `;
    
    // Insert before the "Add more" button
    const addMoreBtn = document.getElementById('addResultImageBtn');
    imagesGrid.insertBefore(newCard, addMoreBtn);
    
    // Add event listeners
    const fileInput = newCard.querySelector('.image-input');
    fileInput.addEventListener('change', handleImageUpload);
    
    // Update "Add more" button text if needed
    if (nextIndex === 4) {
        addMoreBtn.querySelector('span').textContent = 'Max 5 images';
        addMoreBtn.style.opacity = '0.5';
        addMoreBtn.style.cursor = 'not-allowed';
    }
    
    showToast('New result image slot added', 'info');
}

// Update the setupImageUploads function:
function setupImageUploads() {
    // File upload handling
    document.querySelectorAll('.image-input').forEach(input => {
        input.addEventListener('change', handleImageUpload);
    });
    
    // Add more input images button
    const addInputBtn = document.getElementById('addInputImageBtn');
    if (addInputBtn) {
        addInputBtn.addEventListener('click', addInputImageSlot);
    }
    
    // Add more result images button
    const addResultBtn = document.getElementById('addResultImageBtn');
    if (addResultBtn) {
        addResultBtn.addEventListener('click', addResultImageSlot);
    }
    
    // Add image from URL button
    const addUrlBtn = document.getElementById('addImageUrlBtn');
    if (addUrlBtn) {
        addUrlBtn.addEventListener('click', showImageUrlModal);
    }
    
    // Load image from URL
    const loadUrlBtn = document.getElementById('loadImageUrlBtn');
    if (loadUrlBtn) {
        loadUrlBtn.addEventListener('click', loadImageFromUrl);
    }
}

// Update the loadImageFromUrl function to handle both input and result images:
async function loadImageFromUrl() {
    const urlInput = document.getElementById('imageUrlInput');
    const typeSelect = document.getElementById('imageTypeSelect');
    
    const url = urlInput.value.trim();
    const type = typeSelect.value;
    
    if (!url) {
        showToast('Please enter an image URL', 'warning');
        return;
    }
    
    // Validate URL format
    try {
        new URL(url);
    } catch {
        showToast('Please enter a valid URL (e.g., https://example.com/image.jpg)', 'error');
        return;
    }
    
    // Validate it's likely an image URL
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const isImageUrl = imageExtensions.some(ext => 
        url.toLowerCase().includes(ext)
    );
    
    if (!isImageUrl) {
        showToast('URL does not appear to be an image. Please check the extension.', 'warning');
    }
    
    // Show loading
    showLoading(true);
    
    try {
        // Create a proxy URL to avoid CORS issues
        // Note: corsproxy.io requires https:// prefix in the URL
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        
        const response = await fetch(proxyUrl, {
            headers: {
                'Accept': 'image/*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        
        // Validate it's actually an image
        if (!blob.type.startsWith('image/')) {
            throw new Error('URL does not point to an image file');
        }
        
        // Validate file size (max 5MB)
        if (blob.size > 5 * 1024 * 1024) {
            throw new Error('Image file is too large (max 5MB)');
        }
        
        // Convert blob to base64
        const base64Image = await blobToBase64(blob);
        
        // Find appropriate image card based on type
        let targetCard = null;
        let gridId = '';
        let addFunction = null;
        
        if (type === 'input') {
            gridId = 'inputImagesGrid';
            addFunction = addInputImageSlot;
        } else {
            gridId = 'resultImagesGrid';
            addFunction = addResultImageSlot;
        }
        
        const imagesGrid = document.getElementById(gridId);
        if (!imagesGrid) {
            throw new Error('Could not find image grid');
        }
        
        // Find first empty card of the specified type
        const cards = imagesGrid.querySelectorAll(`.image-upload-card[data-type="${type}"]:not(.add-more-btn)`);
        
        // Remove the "add more" button from the search
        const availableCards = Array.from(cards).filter(card => 
            !card.classList.contains('has-image')
        );
        
        // If no empty slot, add a new one
        if (availableCards.length === 0 && addFunction) {
            addFunction();
            // Wait a bit for the new card to be added to DOM
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Get the newly added card (should be the last one before add button)
            const newCards = imagesGrid.querySelectorAll(`.image-upload-card[data-type="${type}"]:not(.add-more-btn)`);
            targetCard = newCards[newCards.length - 1];
            
            if (!targetCard) {
                throw new Error('Failed to create new image slot');
            }
        } else {
            targetCard = availableCards[0];
        }
        
        if (targetCard) {
            // Get the index from the card
            const index = parseInt(targetCard.dataset.index);
            const cacheId = `image-${type}-${index}`;
            
            // Cache the image
            state.imageCache.set(cacheId, base64Image);
            
            // Display preview
            displayImagePreview(targetCard, base64Image);
            
            showToast('Image loaded from URL successfully!', 'success');
            urlInput.value = ''; // Clear input
        }
        
    } catch (error) {
        console.error('Image URL loading error:', error);
        
        // Try a fallback method using img tag
        showToast(`Loading from URL failed. Trying alternative method...`, 'warning');
        
        // Fallback: Use img tag to load image
        setTimeout(() => {
            tryFallbackImageLoad(url, type);
        }, 1000);
        
    } finally {
        showLoading(false);
        closeModal('imageUrlModal');
    }
}

// Helper function to convert blob to base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Fallback method for loading images
function tryFallbackImageLoad(url, type) {
    showLoading(true);
    
    // Create a temporary image element to load and convert
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = function() {
        try {
            // Create canvas to convert image to base64
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // Convert to base64
            const base64Image = canvas.toDataURL('image/png');
            
            // Find target card (same logic as above)
            let targetCard = null;
            let gridId = type === 'input' ? 'inputImagesGrid' : 'resultImagesGrid';
            const imagesGrid = document.getElementById(gridId);
            
            if (imagesGrid) {
                const cards = imagesGrid.querySelectorAll(`.image-upload-card[data-type="${type}"]:not(.add-more-btn)`);
                const availableCards = Array.from(cards).filter(card => 
                    !card.classList.contains('has-image')
                );
                
                if (availableCards.length > 0) {
                    targetCard = availableCards[0];
                    const index = parseInt(targetCard.dataset.index);
                    const cacheId = `image-${type}-${index}`;
                    
                    // Cache the image
                    state.imageCache.set(cacheId, base64Image);
                    
                    // Display preview
                    displayImagePreview(targetCard, base64Image);
                    
                    showToast('Image loaded using fallback method!', 'success');
                }
            }
        } catch (error) {
            console.error('Fallback method error:', error);
            showToast('Failed to load image even with fallback method', 'error');
        } finally {
            showLoading(false);
        }
    };
    
    img.onerror = function() {
        showLoading(false);
        showToast('Failed to load image. The URL might be blocked or invalid.', 'error');
    };
    
    // Start loading
    img.src = url;
}


// Update the loadPromptImages function:
function loadPromptImages(images) {
    if (!images || !Array.isArray(images)) return;
    
    // Clear all existing images first
    document.querySelectorAll('.image-upload-card').forEach(card => {
        removeImage(card);
    });
    
    // Reset both grids to initial state
    resetImageGrid('inputImagesGrid', 'input', addInputImageSlot);
    resetImageGrid('resultImagesGrid', 'result', addResultImageSlot);
    
    // Group images by type
    const inputImages = images.filter(img => img.type === 'input');
    const resultImages = images.filter(img => img.type === 'result');
    
    // Load input images
    inputImages.forEach((img, index) => {
        if (index > 0) {
            addInputImageSlot();
        }
        setTimeout(() => {
            const cards = document.querySelectorAll('.image-upload-card[data-type="input"]');
            const card = cards[index];
            if (card && img.url) {
                const cacheId = `image-input-${card.dataset.index}`;
                state.imageCache.set(cacheId, img.url);
                displayImagePreview(card, img.url);
            }
        }, 100);
    });
    
    // Load result images
    resultImages.forEach((img, index) => {
        if (index > 0) {
            addResultImageSlot();
        }
        setTimeout(() => {
            const cards = document.querySelectorAll('.image-upload-card[data-type="result"]');
            const card = cards[index];
            if (card && img.url) {
                const cacheId = `image-result-${card.dataset.index}`;
                state.imageCache.set(cacheId, img.url);
                displayImagePreview(card, img.url);
            }
        }, 100);
    });
}

// Helper function to reset image grid
function resetImageGrid(gridId, type, addFunction) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    
    // Remove all cards except first one and add button
    const cards = grid.querySelectorAll(`.image-upload-card[data-type="${type}"]`);
    for (let i = 1; i < cards.length; i++) {
        cards[i].remove();
    }
    
    // Reset add button
    const addBtn = grid.querySelector(`#add${type.charAt(0).toUpperCase() + type.slice(1)}ImageBtn`);
    if (addBtn) {
        if (type === 'input') {
            addBtn.querySelector('span').textContent = 'Add Input Image';
        } else {
            addBtn.querySelector('span').textContent = 'Add Result Image';
        }
        addBtn.style.opacity = '1';
        addBtn.style.cursor = 'pointer';
    }
    
    // Reset the first card
    const firstCard = grid.querySelector(`.image-upload-card[data-type="${type}"]`);
    if (firstCard) {
        removeImage(firstCard);
    }
}

// Update the resetPromptForm function:
function resetPromptForm() {
    const form = document.getElementById('promptForm');
    if (form) {
        form.reset();
    }
    
    // Reset tags
    const tagsContainer = document.getElementById('tagsContainer');
    if (tagsContainer) {
        tagsContainer.innerHTML = '';
    }
    
    // Reset images
    document.querySelectorAll('.image-upload-card').forEach(card => {
        removeImage(card);
    });
    
    // Reset both image grids to initial state
    resetImageGrid('inputImagesGrid', 'input', addInputImageSlot);
    resetImageGrid('resultImagesGrid', 'result', addResultImageSlot);
    
    // Clear image cache for this form
    Array.from(state.imageCache.keys()).forEach(key => {
        if (key.startsWith('image-')) {
            state.imageCache.delete(key);
        }
    });
    
    // Reset rating
    updateRatingStars(0);
    
    // Reset character count
    updateCharCount();
    
    // Reset hidden ID
    document.getElementById('promptId').value = '';
}

// Category Management Functions
function showManageCategoriesModal() {
    const modalContent = `
        <div class="category-management">
            <div class="section">
                <h4>Manage Categories</h4>
                <div class="category-management-list" id="manageCategoriesList">
                    <!-- Categories will be populated here -->
                </div>
            </div>
            
            <div class="danger-zone">
                <h5><i class="fas fa-exclamation-triangle"></i> Danger Zone</h5>
                <p class="help-text">Deleting categories will move all prompts to "Other" category.</p>
                <button id="deleteEmptyCategoriesBtn" class="btn btn-outline danger" style="margin-top: 1rem;">
                    <i class="fas fa-trash"></i> Delete Empty Categories
                </button>
            </div>
        </div>
    `;
    
    // Create or update modal
    let modal = document.getElementById('manageCategoriesModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'manageCategoriesModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h2>Manage Categories</h2>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    ${modalContent}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline close-modal">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => closeModal('manageCategoriesModal'));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal('manageCategoriesModal');
        });
    } else {
        modal.querySelector('.modal-body').innerHTML = modalContent;
    }
    
    // Populate categories list
    populateManageCategoriesList();
    
    // Add event listener for delete empty categories button
    document.getElementById('deleteEmptyCategoriesBtn')?.addEventListener('click', deleteEmptyCategories);
    
    showModal('manageCategoriesModal');
}

function populateManageCategoriesList() {
    const list = document.getElementById('manageCategoriesList');
    if (!list) return;
    
    list.innerHTML = '';
    
    // Get all main categories (no parent)
    const mainCategories = Array.from(state.categories.values())
        .filter(cat => !cat.parentId)
        .sort((a, b) => a.name.localeCompare(b.name));
    
    // Get all sub-categories grouped by parent
    const subCategories = Array.from(state.categories.values())
        .filter(cat => cat.parentId)
        .reduce((acc, cat) => {
            if (!acc[cat.parentId]) acc[cat.parentId] = [];
            acc[cat.parentId].push(cat);
            return acc;
        }, {});
    
    // Render main categories and their sub-categories
    mainCategories.forEach(category => {
        const item = document.createElement('div');
        item.className = 'manage-category-item';
        
        const subCats = subCategories[category.id] || [];
        
        item.innerHTML = `
            <div class="manage-category-info">
                <div class="category-color-preview" style="background: ${category.color}"></div>
                <div>
                    <div style="font-weight: 500;">${category.name}</div>
                    ${subCats.length > 0 ? `
                        <div class="category-breadcrumb">
                            ${subCats.length} sub-categor${subCats.length === 1 ? 'y' : 'ies'}
                        </div>
                    ` : ''}
                </div>
                <span class="category-count">${category.count || 0}</span>
            </div>
            <div class="manage-category-actions">
                <button class="btn-icon small edit-category-btn" data-id="${category.id}" title="Edit category">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon small add-subcategory-btn" data-id="${category.id}" title="Add sub-category">
                    <i class="fas fa-folder-plus"></i>
                </button>
                ${category.id !== 'other' ? `
                    <button class="btn-icon small delete-category-btn" data-id="${category.id}" title="Delete category">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        `;
        
        list.appendChild(item);
        
        // Add sub-categories if they exist
        if (subCats.length > 0) {
            subCats.forEach(subCat => {
                const subItem = document.createElement('div');
                subItem.className = 'manage-category-item';
                subItem.style.marginLeft = '1.5rem';
                subItem.style.background = 'var(--bg-tertiary)';
                
                subItem.innerHTML = `
                    <div class="manage-category-info">
                        <div class="category-color-preview" style="background: ${subCat.color}"></div>
                        <div>
                            <div style="font-weight: 500;">${subCat.name}</div>
                            <div class="category-breadcrumb">Sub-category of ${category.name}</div>
                        </div>
                        <span class="category-count">${subCat.count || 0}</span>
                    </div>
                    <div class="manage-category-actions">
                        <button class="btn-icon small edit-category-btn" data-id="${subCat.id}" title="Edit sub-category">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon small delete-category-btn" data-id="${subCat.id}" title="Delete sub-category">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                list.appendChild(subItem);
            });
        }
    });
    
    // Add event listeners
    list.querySelectorAll('.edit-category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const categoryId = e.currentTarget.dataset.id;
            editCategory(categoryId);
        });
    });
    
    list.querySelectorAll('.add-subcategory-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const parentId = e.currentTarget.dataset.id;
            showAddSubCategoryForm(parentId);
        });
    });
    
    list.querySelectorAll('.delete-category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const categoryId = e.currentTarget.dataset.id;
            deleteCategory(categoryId);
        });
    });
}

function showAddSubCategoryForm(parentId) {
    const parentCategory = state.categories.get(parentId);
    if (!parentCategory) return;
    
    const name = prompt(`Add sub-category under "${parentCategory.name}":`, '');
    if (!name || !name.trim()) return;
    
    const id = `${parentId}-${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
    
    if (state.categories.has(id)) {
        showToast('Sub-category already exists', 'warning');
        return;
    }
    
    const category = {
        id,
        name: name.trim(),
        parentId,
        color: generateRandomColor(),
        icon: 'fas fa-folder',
        count: 0,
        createdAt: new Date().toISOString()
    };
    
    state.categories.set(id, category);
    saveCategories();
    
    // Update category list
    updateCategoryList();
    initializeCategoriesDropdown();
    
    showToast('Sub-category added', 'success');
}

function deleteEmptyCategories() {
    const emptyCategories = Array.from(state.categories.values())
        .filter(cat => cat.count === 0 && cat.id !== 'other')
        .map(cat => cat.name);
    
    if (emptyCategories.length === 0) {
        showToast('No empty categories found', 'info');
        return;
    }
    
    showConfirmModal(
        'Delete Empty Categories',
        `This will delete ${emptyCategories.length} empty categor${emptyCategories.length === 1 ? 'y' : 'ies'}: ${emptyCategories.join(', ')}. Continue?`,
        () => {
            // Delete empty categories
            emptyCategories.forEach(catName => {
                const category = Array.from(state.categories.values()).find(c => c.name === catName);
                if (category) {
                    state.categories.delete(category.id);
                }
            });
            
            saveCategories();
            updateCategoryList();
            initializeCategoriesDropdown();
            
            showToast(`Deleted ${emptyCategories.length} empty categor${emptyCategories.length === 1 ? 'y' : 'ies'}`, 'success');
            closeModal('manageCategoriesModal');
        }
    );
}

// Updated editCategory function to handle parent categories
function editCategory(categoryId) {
    const category = state.categories.get(categoryId);
    if (!category) return;
    
    const isSubCategory = !!category.parentId;
    
    // Create a more advanced edit form
    const modalContent = `
        <div class="form-grid">
            <div class="form-group">
                <label>Category Name</label>
                <input type="text" id="editCategoryName" value="${category.name}">
            </div>
            <div class="form-group">
                <label>Color</label>
                <input type="color" id="editCategoryColor" value="${category.color}">
            </div>
            ${!isSubCategory ? `
                <div class="form-group">
                    <label>Parent Category</label>
                    <select id="editCategoryParent">
                        <option value="">None (Main Category)</option>
                        ${Array.from(state.categories.values())
                            .filter(cat => !cat.parentId && cat.id !== categoryId)
                            .map(cat => `<option value="${cat.id}" ${category.parentId === cat.id ? 'selected' : ''}>${cat.name}</option>`)
                            .join('')}
                    </select>
                </div>
            ` : ''}
        </div>
        <div class="form-actions" style="margin-top: 1rem;">
            <button id="saveEditCategoryBtn" class="btn btn-primary">Save Changes</button>
            <button id="cancelEditCategoryBtn" class="btn btn-outline">Cancel</button>
        </div>
    `;
    
    // Create edit modal
    let modal = document.getElementById('editCategoryModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'editCategoryModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content modal-sm">
                <div class="modal-header">
                    <h3>Edit Category</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    ${modalContent}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.querySelector('.close-modal').addEventListener('click', () => closeModal('editCategoryModal'));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal('editCategoryModal');
        });
    } else {
        modal.querySelector('.modal-body').innerHTML = modalContent;
    }
    
    // Add event listeners
    const saveBtn = modal.querySelector('#saveEditCategoryBtn');
    const cancelBtn = modal.querySelector('#cancelEditCategoryBtn');
    
    saveBtn.onclick = () => {
        const newName = modal.querySelector('#editCategoryName').value.trim();
        const newColor = modal.querySelector('#editCategoryColor').value;
        const newParentId = isSubCategory ? category.parentId : (modal.querySelector('#editCategoryParent')?.value || '');
        
        if (!newName) {
            showToast('Please enter a category name', 'warning');
            return;
        }
        
        const newId = newParentId ? 
            `${newParentId}-${newName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}` :
            newName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        if (state.categories.has(newId) && newId !== categoryId) {
            showToast('Category name already exists', 'warning');
            return;
        }
        
        // Update category
        category.name = newName;
        category.color = newColor;
        
        if (!isSubCategory) {
            category.parentId = newParentId || null;
        }
        
        // If ID changed, update all prompts with this category
        if (newId !== categoryId) {
            state.prompts.forEach(prompt => {
                if (prompt.category === categoryId) {
                    prompt.category = newId;
                }
            });
            
            state.categories.delete(categoryId);
            category.id = newId;
            state.categories.set(newId, category);
        }
        
        // Save changes
        saveState();
        saveCategories();
        
        // Update UI
        initializeCategoriesDropdown();
        updateCategoryList();
        renderPrompts();
        
        if (document.getElementById('manageCategoriesModal')?.classList.contains('active')) {
            populateManageCategoriesList();
        }
        
        closeModal('editCategoryModal');
        showToast('Category updated', 'success');
    };
    
    cancelBtn.onclick = () => closeModal('editCategoryModal');
    
    showModal('editCategoryModal');
}

// Updated updateCategoryList function to show sub-categories
function updateCategoryList() {
    if (!elements.categoryList) return;
    
    elements.categoryList.innerHTML = '';
    
    // Get all main categories (no parent)
    const mainCategories = Array.from(state.categories.values())
        .filter(cat => !cat.parentId)
        .sort((a, b) => a.name.localeCompare(b.name));
    
    // Get all sub-categories grouped by parent
    const subCategories = Array.from(state.categories.values())
        .filter(cat => cat.parentId)
        .reduce((acc, cat) => {
            if (!acc[cat.parentId]) acc[cat.parentId] = [];
            acc[cat.parentId].push(cat);
            return acc;
        }, {});
    
    // Render main categories with sub-categories
    mainCategories.forEach(category => {
        const hasSubCategories = subCategories[category.id]?.length > 0;
        const isExpanded = false; // You could store this in state
        
        // Calculate total count including sub-categories
        const subCategoryCount = (subCategories[category.id] || []).reduce((sum, subCat) => sum + (subCat.count || 0), 0);
        const totalCount = category.count + subCategoryCount;
        
        const item = document.createElement('div');
        item.className = `category-item ${hasSubCategories ? 'has-children' : ''}`;
        item.dataset.category = category.id;
        
        if (hasSubCategories) {
            item.innerHTML = `
                <div class="category-item-header">
                    <div class="category-item-content">
                        <button class="category-toggle ${isExpanded ? 'expanded' : ''}">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                        <span class="category-badge" style="background: ${category.color}"></span>
                        <span>${category.name}</span>
                    </div>
                    <span class="category-count">${totalCount}</span>
                </div>
                <div class="subcategories-list" style="display: ${isExpanded ? 'block' : 'none'}">
                    ${(subCategories[category.id] || [])
                        .map(subCat => `
                            <div class="subcategory-item" data-category="${subCat.id}">
                                <div class="category-item-content">
                                    <span class="category-badge" style="background: ${subCat.color}; margin-left: 0.5rem;"></span>
                                    <span>${subCat.name}</span>
                                </div>
                                <span class="category-count">${subCat.count}</span>
                            </div>
                        `).join('')}
                </div>
            `;
            
            // Toggle sub-categories
            const toggleBtn = item.querySelector('.category-toggle');
            const subList = item.querySelector('.subcategories-list');
            
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isExpanded = toggleBtn.classList.contains('expanded');
                toggleBtn.classList.toggle('expanded', !isExpanded);
                subList.style.display = isExpanded ? 'none' : 'block';
            });
        } else {
            item.innerHTML = `
                <div class="category-item-content">
                    <span class="category-badge" style="background: ${category.color}"></span>
                    <span>${category.name}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span class="category-count">${totalCount}</span>
                    <button class="btn-icon small add-subcategory-sidebar" data-id="${category.id}" title="Add sub-category">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            `;
            
            // Add sub-category button
            const addBtn = item.querySelector('.add-subcategory-sidebar');
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showAddSubCategoryForm(category.id);
            });
        }
        
        // Category click handler
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.category-toggle') && !e.target.closest('.btn-icon')) {
                filterByCategory(category.id);
            }
        });
        
        elements.categoryList.appendChild(item);
        
        // Add click handlers for sub-categories
        if (hasSubCategories) {
            item.querySelectorAll('.subcategory-item').forEach(subItem => {
                subItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const subCategoryId = subItem.dataset.category;
                    filterByCategory(subCategoryId);
                });
            });
        }
    });
}

// Updated initializeCategoriesDropdown to include sub-categories
function initializeCategoriesDropdown() {
    const select = document.getElementById('promptCategory');
    if (!select) return;
    
    // Clear existing options except the first one
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Get main categories
    const mainCategories = Array.from(state.categories.values())
        .filter(cat => !cat.parentId)
        .sort((a, b) => a.name.localeCompare(b.name));
    
    // Get sub-categories grouped by parent
    const subCategories = Array.from(state.categories.values())
        .filter(cat => cat.parentId)
        .reduce((acc, cat) => {
            if (!acc[cat.parentId]) acc[cat.parentId] = [];
            acc[cat.parentId].push(cat);
            return acc;
        }, {});
    
    // Add categories with indentation for sub-categories
    mainCategories.forEach(category => {
        // Add main category
        const mainOption = document.createElement('option');
        mainOption.value = category.id;
        mainOption.textContent = category.name;
        select.appendChild(mainOption);
        
        // Add sub-categories if they exist
        if (subCategories[category.id]) {
            subCategories[category.id].forEach(subCat => {
                const subOption = document.createElement('option');
                subOption.value = subCat.id;
                subOption.textContent = `  └─ ${subCat.name}`; // Indentation
                select.appendChild(subOption);
            });
        }
    });
}

// ============================================
// CUSTOM ORDER PERSISTENCE
// ============================================

function saveCustomOrder() {
    try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_ORDER, JSON.stringify(state.customOrder));
    } catch (error) {
        console.error('❌ Failed to save custom order:', error);
    }
}

// ============================================
// DRAG & DROP REORDERING
// ============================================

function addDragDropListeners(element, prompt) {
    // Drag Start
    element.addEventListener('dragstart', (e) => {
        state.draggedPromptId = prompt.id;
        element.classList.add('dragging');
        
        // Set drag data
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', prompt.id);
        
        // Create a slightly transparent drag image
        const dragImage = element.cloneNode(true);
        dragImage.style.width = element.offsetWidth + 'px';
        dragImage.style.opacity = '0.8';
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px';
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, 20, 20);
        
        // Clean up drag image after a moment
        setTimeout(() => {
            document.body.removeChild(dragImage);
        }, 0);
    });
    
    // Drag End
    element.addEventListener('dragend', (e) => {
        element.classList.remove('dragging');
        state.draggedPromptId = null;
        
        // Clean up all drag-over indicators
        document.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
            el.classList.remove('drag-over-top', 'drag-over-bottom');
        });
    });
    
    // Drag Over
    element.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        if (state.draggedPromptId === prompt.id) return;
        
        // Determine if we're above or below the midpoint
        const rect = element.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        
        // Clear previous indicators on this element
        element.classList.remove('drag-over-top', 'drag-over-bottom');
        
        if (e.clientY < midY) {
            element.classList.add('drag-over-top');
        } else {
            element.classList.add('drag-over-bottom');
        }
    });
    
    // Drag Leave
    element.addEventListener('dragleave', (e) => {
        // Only remove if we're actually leaving (not entering a child element)
        const rect = element.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || 
            e.clientY < rect.top || e.clientY > rect.bottom) {
            element.classList.remove('drag-over-top', 'drag-over-bottom');
        }
    });
    
    // Drop
    element.addEventListener('drop', (e) => {
        e.preventDefault();
        
        const draggedId = e.dataTransfer.getData('text/plain') || state.draggedPromptId;
        const targetId = prompt.id;
        
        if (!draggedId || draggedId === targetId) return;
        
        // Determine drop position (before or after target)
        const rect = element.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const insertAfter = e.clientY >= midY;
        
        // Build the new custom order
        // Start with current visible order (filtered + sorted)
        ensureCustomOrderComplete();
        
        // Remove dragged item from custom order
        const newOrder = state.customOrder.filter(id => id !== draggedId);
        
        // Find the target position
        const targetIndex = newOrder.indexOf(targetId);
        
        if (targetIndex === -1) return;
        
        // Insert at the correct position
        const insertIndex = insertAfter ? targetIndex + 1 : targetIndex;
        newOrder.splice(insertIndex, 0, draggedId);
        
        // Update state
        state.customOrder = newOrder;
        saveCustomOrder();
        
        // Switch to custom sort if not already
        state.currentSort = 'custom';
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.value = 'custom';
        }
        
        // Clean up indicators
        element.classList.remove('drag-over-top', 'drag-over-bottom');
        
        // Re-render
        renderPrompts();
        
        showToast('Prompt order updated', 'success');
    });
}

// Ensure all prompt IDs are in the custom order array
function ensureCustomOrderComplete() {
    const existingIds = new Set(state.customOrder);
    state.prompts.forEach(p => {
        if (!existingIds.has(p.id)) {
            state.customOrder.push(p.id);
        }
    });
    // Remove IDs that no longer exist in prompts
    const promptIds = new Set(state.prompts.map(p => p.id));
    state.customOrder = state.customOrder.filter(id => promptIds.has(id));
}

// ============================================
// PROMPT COMPARISON VIEW
// ============================================

function showComparisonModal() {
    if (state.selectedPrompts.size !== 2) {
        showToast('Please select exactly 2 prompts to compare', 'warning');
        return;
    }
    
    const selectedIds = Array.from(state.selectedPrompts);
    const prompt1 = state.prompts.find(p => p.id === selectedIds[0]);
    const prompt2 = state.prompts.find(p => p.id === selectedIds[1]);
    
    if (!prompt1 || !prompt2) {
        showToast('Could not find selected prompts', 'error');
        return;
    }
    
    const content = document.getElementById('comparisonContent');
    if (!content) return;
    
    // Calculate stats for both
    const stats1 = {
        words: calculateWordCount(prompt1.content),
        tokens: estimateTokenCount(prompt1.content),
        complexity: prompt1.complexity || calculateComplexity(prompt1),
        rating: prompt1.rating || 0,
        usageCount: prompt1.usageCount || 0,
        charCount: prompt1.content.length
    };
    
    const stats2 = {
        words: calculateWordCount(prompt2.content),
        tokens: estimateTokenCount(prompt2.content),
        complexity: prompt2.complexity || calculateComplexity(prompt2),
        rating: prompt2.rating || 0,
        usageCount: prompt2.usageCount || 0,
        charCount: prompt2.content.length
    };
    
    // Compute tag comparison
    const tags1 = new Set(prompt1.tags || []);
    const tags2 = new Set(prompt2.tags || []);
    const sharedTags = [...tags1].filter(t => tags2.has(t));
    const uniqueToLeft = [...tags1].filter(t => !tags2.has(t));
    const uniqueToRight = [...tags2].filter(t => !tags1.has(t));
    
    // Compute diff
    const diffHtml1 = computeDiffHtml(prompt1.content, prompt2.content, 'left');
    const diffHtml2 = computeDiffHtml(prompt2.content, prompt1.content, 'right');
    
    content.innerHTML = `
        <div class="comparison-container">
            <!-- Header with titles -->
            <div class="comparison-header">
                <div class="comparison-prompt-title">
                    <span class="prompt-category" style="background: ${getCategoryColor(prompt1.category)}">
                        <i class="${getCategoryIcon(prompt1.category)}"></i>
                        ${getCategoryName(prompt1.category)}
                    </span>
                    ${escapeHtml(prompt1.title)}
                </div>
                <div class="comparison-vs">VS</div>
                <div class="comparison-prompt-title" style="text-align: right; justify-content: flex-end;">
                    ${escapeHtml(prompt2.title)}
                    <span class="prompt-category" style="background: ${getCategoryColor(prompt2.category)}">
                        <i class="${getCategoryIcon(prompt2.category)}"></i>
                        ${getCategoryName(prompt2.category)}
                    </span>
                </div>
            </div>
            
            <!-- Content Comparison -->
            <div class="comparison-grid">
                <div class="comparison-card left">
                    <div class="comparison-card-header">
                        <i class="fas fa-comment-dots"></i> Prompt Content
                    </div>
                    <div class="comparison-card-body">
                        <div class="content-box">${diffHtml1}</div>
                    </div>
                </div>
                <div class="comparison-card right">
                    <div class="comparison-card-header">
                        <i class="fas fa-comment-dots"></i> Prompt Content
                    </div>
                    <div class="comparison-card-body">
                        <div class="content-box">${diffHtml2}</div>
                    </div>
                </div>
            </div>
            
            <!-- Stats Comparison -->
            <div class="comparison-stat-group">
                <h4><i class="fas fa-chart-bar"></i> Statistics Comparison</h4>
                ${buildStatComparisonRow('Characters', stats1.charCount, stats2.charCount)}
                ${buildStatComparisonRow('Words', stats1.words, stats2.words)}
                ${buildStatComparisonRow('Tokens', stats1.tokens, stats2.tokens)}
                ${buildStatComparisonRow('Complexity', stats1.complexity, stats2.complexity, 5)}
                ${buildStatComparisonRow('Rating', stats1.rating, stats2.rating, 5)}
                ${buildStatComparisonRow('Usage Count', stats1.usageCount, stats2.usageCount)}
            </div>
            
            <!-- Tags Comparison -->
            <div class="comparison-tags">
                <h4><i class="fas fa-tags"></i> Tags Comparison</h4>
                <div class="tags-comparison-grid">
                    <div class="tags-comparison-col">
                        <div class="tags-comparison-col-title">Only in Left</div>
                        ${uniqueToLeft.length > 0 
                            ? uniqueToLeft.map(t => `<span class="tag-unique-left">${escapeHtml(t)}</span>`).join('') 
                            : '<span style="color: var(--text-muted); font-size: 0.8rem;">None</span>'}
                    </div>
                    <div class="tags-comparison-col" style="text-align: center;">
                        <div class="tags-comparison-col-title">Shared</div>
                        ${sharedTags.length > 0 
                            ? sharedTags.map(t => `<span class="tag-shared"><i class="fas fa-link"></i> ${escapeHtml(t)}</span>`).join('') 
                            : '<span style="color: var(--text-muted); font-size: 0.8rem;">None</span>'}
                    </div>
                    <div class="tags-comparison-col" style="text-align: right;">
                        <div class="tags-comparison-col-title">Only in Right</div>
                        ${uniqueToRight.length > 0 
                            ? uniqueToRight.map(t => `<span class="tag-unique-right">${escapeHtml(t)}</span>`).join('') 
                            : '<span style="color: var(--text-muted); font-size: 0.8rem;">None</span>'}
                    </div>
                </div>
            </div>
            
            <!-- Notes Comparison -->
            ${(prompt1.notes || prompt2.notes) ? `
                <div class="comparison-grid">
                    <div class="comparison-card left">
                        <div class="comparison-card-header">
                            <i class="fas fa-sticky-note"></i> Notes
                        </div>
                        <div class="comparison-card-body">
                            <div class="content-box">${prompt1.notes ? escapeHtml(prompt1.notes).replace(/\n/g, '<br>') : '<span style="color: var(--text-muted);">No notes</span>'}</div>
                        </div>
                    </div>
                    <div class="comparison-card right">
                        <div class="comparison-card-header">
                            <i class="fas fa-sticky-note"></i> Notes
                        </div>
                        <div class="comparison-card-body">
                            <div class="content-box">${prompt2.notes ? escapeHtml(prompt2.notes).replace(/\n/g, '<br>') : '<span style="color: var(--text-muted);">No notes</span>'}</div>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <!-- Metadata Comparison -->
            <div class="comparison-meta">
                <div class="comparison-meta-card">
                    <h5><i class="fas fa-info-circle"></i> Left Prompt Metadata</h5>
                    <div class="comparison-meta-row">
                        <span class="comparison-meta-label">Engine:</span>
                        <span class="comparison-meta-value">${prompt1.engine || 'Not specified'}</span>
                    </div>
                    <div class="comparison-meta-row">
                        <span class="comparison-meta-label">Created:</span>
                        <span class="comparison-meta-value">${formatDate(prompt1.createdAt)}</span>
                    </div>
                    <div class="comparison-meta-row">
                        <span class="comparison-meta-label">Updated:</span>
                        <span class="comparison-meta-value">${formatDate(prompt1.updatedAt)}</span>
                    </div>
                    <div class="comparison-meta-row">
                        <span class="comparison-meta-label">Images:</span>
                        <span class="comparison-meta-value">${prompt1.images ? prompt1.images.length : 0}</span>
                    </div>
                </div>
                <div class="comparison-meta-card">
                    <h5><i class="fas fa-info-circle"></i> Right Prompt Metadata</h5>
                    <div class="comparison-meta-row">
                        <span class="comparison-meta-label">Engine:</span>
                        <span class="comparison-meta-value">${prompt2.engine || 'Not specified'}</span>
                    </div>
                    <div class="comparison-meta-row">
                        <span class="comparison-meta-label">Created:</span>
                        <span class="comparison-meta-value">${formatDate(prompt2.createdAt)}</span>
                    </div>
                    <div class="comparison-meta-row">
                        <span class="comparison-meta-label">Updated:</span>
                        <span class="comparison-meta-value">${formatDate(prompt2.updatedAt)}</span>
                    </div>
                    <div class="comparison-meta-row">
                        <span class="comparison-meta-label">Images:</span>
                        <span class="comparison-meta-value">${prompt2.images ? prompt2.images.length : 0}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    showModal('comparisonModal');
}

// Build a stat comparison row with visual bars
function buildStatComparisonRow(label, value1, value2, maxVal) {
    const max = maxVal || Math.max(value1, value2, 1);
    const pct1 = Math.round((value1 / max) * 100);
    const pct2 = Math.round((value2 / max) * 100);
    const winner1 = value1 > value2;
    const winner2 = value2 > value1;
    
    return `
        <div class="stat-comparison-row">
            <span class="stat-comparison-label">${label}</span>
            <div class="stat-comparison-values">
                <span class="stat-value-num left ${winner1 ? 'winner' : ''}">${value1}${winner1 ? ' ★' : ''}</span>
                <div class="stat-comparison-bar">
                    <div class="stat-bar-fill left" style="width: ${pct1}%; flex: 1;"></div>
                    <div class="stat-bar-fill right" style="width: ${pct2}%; flex: 1;"></div>
                </div>
                <span class="stat-value-num right ${winner2 ? 'winner' : ''}">${value2}${winner2 ? ' ★' : ''}</span>
            </div>
        </div>
    `;
}

// Simple word-level diff for comparison
function computeDiffHtml(textA, textB, side) {
    const wordsA = textA.split(/(\s+)/);
    const wordsB = textB.split(/(\s+)/);
    
    // Create a Set of words in the other text for quick lookup
    const otherWords = new Set(side === 'left' ? wordsB : wordsA);
    
    // For a more meaningful diff, compare word by word with position awareness
    const maxLen = Math.max(wordsA.length, wordsB.length);
    const result = [];
    
    // Use LCS-based approach for small texts, simple approach for large ones
    if (wordsA.length < 500 && wordsB.length < 500) {
        // Build word sequences (skip whitespace for comparison)
        const seqA = wordsA.filter(w => w.trim().length > 0);
        const seqB = wordsB.filter(w => w.trim().length > 0);
        
        // Compute LCS table
        const lcs = computeLCS(seqA, seqB);
        const lcsSet = new Set(lcs.map((item, idx) => `${item.aIdx}`));
        const lcsSetB = new Set(lcs.map((item, idx) => `${item.bIdx}`));
        
        if (side === 'left') {
            // Highlight words in A that are NOT in LCS (removed/different)
            let seqIdx = 0;
            for (let i = 0; i < wordsA.length; i++) {
                const word = wordsA[i];
                if (word.trim().length === 0) {
                    result.push(word);
                    continue;
                }
                if (lcsSet.has(`${seqIdx}`)) {
                    result.push(`<span class="diff-same">${escapeHtml(word)}</span>`);
                } else {
                    result.push(`<span class="diff-removed">${escapeHtml(word)}</span>`);
                }
                seqIdx++;
            }
        } else {
            // Highlight words in B that are NOT in LCS (added/different)
            let seqIdx = 0;
            for (let i = 0; i < wordsB.length; i++) {
                const word = wordsB[i];
                if (word.trim().length === 0) {
                    result.push(word);
                    continue;
                }
                if (lcsSetB.has(`${seqIdx}`)) {
                    result.push(`<span class="diff-same">${escapeHtml(word)}</span>`);
                } else {
                    result.push(`<span class="diff-added">${escapeHtml(word)}</span>`);
                }
                seqIdx++;
            }
        }
    } else {
        // Simple fallback for very large texts
        const words = side === 'left' ? wordsA : wordsB;
        words.forEach(word => {
            if (word.trim().length === 0) {
                result.push(word);
            } else {
                result.push(`<span class="diff-same">${escapeHtml(word)}</span>`);
            }
        });
    }
    
    return result.join('');
}

// Compute Longest Common Subsequence with index tracking
function computeLCS(seqA, seqB) {
    const m = seqA.length;
    const n = seqB.length;
    
    // Build DP table
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (seqA[i - 1].toLowerCase() === seqB[j - 1].toLowerCase()) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    
    // Backtrack to find LCS with indices
    const result = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
        if (seqA[i - 1].toLowerCase() === seqB[j - 1].toLowerCase()) {
            result.unshift({ word: seqA[i - 1], aIdx: i - 1, bIdx: j - 1 });
            i--;
            j--;
        } else if (dp[i - 1][j] > dp[i][j - 1]) {
            i--;
        } else {
            j--;
        }
    }
    
    return result;
}

console.log('✨ Prompt Vault ready!');