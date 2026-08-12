/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Array to store selected products */
let selectedProducts = [];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Update the selected products list display above the button */
function updateSelectedProductsList() {
  /* Create HTML for each selected product with a remove button */
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
    <div class="selected-product-tag">
      <span>${product.name}</span>
      <button type="button" class="remove-btn" data-product-id="${product.id}">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `,
    )
    .join("");

  /* Add click handlers to remove buttons */
  const removeButtons = selectedProductsList.querySelectorAll(".remove-btn");
  removeButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.preventDefault();
      const productId = parseInt(button.getAttribute("data-product-id"));
      deselectProduct(productId);
    });
  });
}

/* Toggle product selection when clicked */
function toggleProductSelection(product) {
  /* Check if product is already selected */
  const existingIndex = selectedProducts.findIndex((p) => p.id === product.id);

  if (existingIndex > -1) {
    /* Product is selected, remove it */
    selectedProducts.splice(existingIndex, 1);
  } else {
    /* Product is not selected, add it */
    selectedProducts.push(product);
  }

  /* Update the visual displays */
  updateSelectedProductsList();
  highlightSelectedProducts();
}

/* Remove a product from selection */
function deselectProduct(productId) {
  selectedProducts = selectedProducts.filter((p) => p.id !== productId);
  updateSelectedProductsList();
  highlightSelectedProducts();
}

/* Highlight selected product cards */
function highlightSelectedProducts() {
  /* Get all product cards */
  const productCards = document.querySelectorAll(".product-card");

  productCards.forEach((card) => {
    /* Get the product ID from the card's data attribute */
    const productId = parseInt(card.getAttribute("data-product-id"));

    /* Check if this product is selected */
    const isSelected = selectedProducts.some((p) => p.id === productId);

    if (isSelected) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `,
    )
    .join("");

  /* Add click handlers to product cards */
  const productCards = productsContainer.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    card.addEventListener("click", () => {
      /* Find the product data from the card */
      const productId = parseInt(card.getAttribute("data-product-id"));
      const product = products.find((p) => p.id === productId);
      if (product) {
        toggleProductSelection(product);
      }
    });
  });

  /* Highlight any previously selected products */
  highlightSelectedProducts();
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory,
  );

  displayProducts(filteredProducts);
});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});
