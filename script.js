/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const generateRoutineBtn = document.getElementById("generateRoutine");
const clearProductsBtn = document.getElementById("clearProducts");
const userInput = document.getElementById("userInput");

/* Modal DOM elements */
const productModal = document.getElementById("productModal");
const closeModalBtn = document.getElementById("closeModal");
const modalProductImage = document.getElementById("modalProductImage");
const modalProductName = document.getElementById("modalProductName");
const modalProductBrand = document.getElementById("modalProductBrand");
const modalProductDescription = document.getElementById(
  "modalProductDescription",
);

/* Array to store selected products */
let selectedProducts = [];

/* Array to store conversation history for OpenAI */
let messages = [];

/* Cloudflare Worker URL for OpenAI API calls */
const WORKER_URL = "https://chat-worker.bailey-caldera1070.workers.dev/";

/* localStorage key for persisting selected products */
const STORAGE_KEY = "loreal_selected_products";

/* Load selected products from localStorage on page load */
function loadSelectedProductsFromStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      selectedProducts = JSON.parse(stored);
    } catch (error) {
      console.error("Error loading stored products:", error);
      selectedProducts = [];
    }
  }
}

/* Save selected products to localStorage */
function saveSelectedProductsToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedProducts));
}

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

/* Open modal with product details */
function openProductModal(product) {
  /* Populate modal with product information */
  modalProductImage.src = product.image;
  modalProductImage.alt = product.name;
  modalProductName.textContent = product.name;
  modalProductBrand.textContent = product.brand;
  modalProductDescription.textContent = product.description;

  /* Display the modal */
  productModal.style.display = "flex";

  /* Prevent body from scrolling when modal is open */
  document.body.style.overflow = "hidden";
}

/* Close product modal */
function closeProductModal() {
  productModal.style.display = "none";

  /* Re-enable body scrolling */
  document.body.style.overflow = "auto";
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

  /* Save to localStorage */
  saveSelectedProductsToStorage();
}

/* Remove a product from selection */
function deselectProduct(productId) {
  selectedProducts = selectedProducts.filter((p) => p.id !== productId);
  updateSelectedProductsList();
  highlightSelectedProducts();

  /* Save to localStorage */
  saveSelectedProductsToStorage();
}

/* Clear all selected products */
function clearAllProducts() {
  selectedProducts = [];
  updateSelectedProductsList();
  highlightSelectedProducts();

  /* Save to localStorage */
  saveSelectedProductsToStorage();
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
      <button type="button" class="details-btn" data-product-id="${product.id}">
        <i class="fa-solid fa-circle-info"></i> Details
      </button>
    </div>
  `,
    )
    .join("");

  /* Add click handlers to product cards for selection */
  const productCards = productsContainer.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    card.addEventListener("click", (e) => {
      /* Only select if not clicking the details button */
      if (!e.target.closest(".details-btn")) {
        /* Find the product data from the card */
        const productId = parseInt(card.getAttribute("data-product-id"));
        const product = products.find((p) => p.id === productId);
        if (product) {
          toggleProductSelection(product);
        }
      }
    });
  });

  /* Add click handlers to details buttons */
  const detailsButtons = productsContainer.querySelectorAll(".details-btn");
  detailsButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      /* Find the product data */
      const productId = parseInt(button.getAttribute("data-product-id"));
      const product = products.find((p) => p.id === productId);
      if (product) {
        openProductModal(product);
      }
    });
  });

  /* Highlight any previously selected products */
  highlightSelectedProducts();
}

/* Send a message to the Cloudflare Worker and get a response */
async function sendMessageToWorker(userMessage) {
  try {
    /* Add user message to conversation history */
    messages.push({
      role: "user",
      content: userMessage,
    });

    /* Show user message in chat */
    displayMessageInChat("user", userMessage);

    /* Clear input field */
    userInput.value = "";

    /* Show loading indicator */
    displayMessageInChat("assistant", "Thinking...");

    /* Send request to Cloudflare Worker with full conversation history */
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages }),
    });

    /* Parse the response */
    const data = await response.json();

    /* Extract the assistant's reply from OpenAI response */
    const assistantMessage = data.choices[0].message.content;

    /* Add assistant response to conversation history */
    messages.push({
      role: "assistant",
      content: assistantMessage,
    });

    /* Remove loading indicator and display actual response */
    chatWindow.lastChild.remove();
    displayMessageInChat("assistant", assistantMessage);
  } catch (error) {
    /* Display error message if API call fails */
    console.error("Error:", error);
    displayMessageInChat(
      "assistant",
      "Sorry, I encountered an error. Please try again.",
    );
  }
}

/* Format content to convert numbered/bulleted lists into readable HTML */
function formatContent(text) {
  /* Split content by line breaks */
  const lines = text.split("\n");
  let htmlContent = "";
  let inList = false;

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    /* Check if line is a numbered list item (e.g., "1. ", "2. ") */
    const numberedMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);

    /* Check if line is a bulleted list item (e.g., "- ", "• ") */
    const bulletMatch = trimmedLine.match(/^[-•]\s+(.+)$/);

    if (numberedMatch || bulletMatch) {
      /* If not already in a list, start one */
      if (!inList) {
        inList = true;
        htmlContent += '<ul class="routine-list">';
      }

      /* Add list item */
      const itemText = numberedMatch ? numberedMatch[1] : bulletMatch[1];
      htmlContent += `<li>${itemText}</li>`;
    } else if (trimmedLine !== "") {
      /* Close list if we were in one and hit a non-list line */
      if (inList) {
        inList = false;
        htmlContent += "</ul>";
      }

      /* Add paragraph for regular text */
      htmlContent += `<p>${trimmedLine}</p>`;
    }
  });

  /* Close list if still open at end */
  if (inList) {
    htmlContent += "</ul>";
  }

  return htmlContent;
}

/* Display a message in the chat window */
function displayMessageInChat(role, content) {
  /* Create a message element with role-specific styling */
  const messageDiv = document.createElement("div");
  messageDiv.className = `chat-message ${role}`;

  /* Format the content for better readability */
  const formattedContent = formatContent(content);

  /* Add the formatted message content */
  messageDiv.innerHTML = formattedContent;

  /* Add message to chat window */
  chatWindow.appendChild(messageDiv);

  /* Scroll chat window to show newest message */
  chatWindow.scrollTop = chatWindow.scrollHeight;
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

/* Handle Generate Routine button click */
generateRoutineBtn.addEventListener("click", async () => {
  /* Check if products are selected */
  if (selectedProducts.length === 0) {
    displayMessageInChat(
      "assistant",
      "Please select at least one product before generating a routine.",
    );
    return;
  }

  /* Create a list of selected product names and brands */
  const productList = selectedProducts
    .map((product) => `${product.name} by ${product.brand}`)
    .join(", ");

  /* Create the initial system message if this is the first interaction */
  if (messages.length === 0) {
    messages.push({
      role: "system",
      content:
        "You are a knowledgeable L'Oréal skincare and beauty advisor. Help users build personalized beauty routines using the products they select. IMPORTANT: Use numbered lists ONLY for the initial routine creation. For follow-up questions and conversations, respond in natural paragraph format unless the user specifically asks for a list. Provide detailed, helpful explanations that educate users about WHY each product matters and HOW to use it effectively. Be friendly, practical, and specific with your advice.",
    });
  }

  /* Create the user's initial request for routine generation */
  const routineRequest = `Please create a personalized daily beauty routine using these products: ${productList}. Format the routine as a numbered list with separate morning and evening sections. For each step, include: (1) the product name and brand, (2) a detailed explanation of what this product does and why it's important for the routine, and (3) how to apply or use it. Be thorough and educational in your explanations.`;

  /* Send the routine request to the Worker */
  await sendMessageToWorker(routineRequest);
});

/* Chat form submission handler for follow-up questions */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userMessage = userInput.value.trim();

  /* Check if message is not empty */
  if (userMessage === "") {
    return;
  }

  /* Check if a routine has been generated yet */
  if (messages.length === 0) {
    displayMessageInChat(
      "assistant",
      "Please click 'Generate Routine' first to start building your routine.",
    );
    return;
  }

  /* Send the user's message to the Worker */
  await sendMessageToWorker(userMessage);
});

/* Clear all selected products button handler */
clearProductsBtn.addEventListener("click", (e) => {
  e.preventDefault();
  clearAllProducts();
});

/* Initialize page: load saved products on page load */
document.addEventListener("DOMContentLoaded", async () => {
  /* Load saved products from localStorage */
  loadSelectedProductsFromStorage();

  /* Update the display with saved products */
  updateSelectedProductsList();

  /* Load all products to check which ones are saved and highlight them */
  if (selectedProducts.length > 0) {
    const allProducts = await loadProducts();

    /* Highlight saved products if a category hasn't been selected yet */
    highlightSelectedProducts();
  }

  /* Add event listeners for modal */
  closeModalBtn.addEventListener("click", closeProductModal);

  /* Close modal when clicking outside the modal content */
  productModal.addEventListener("click", (e) => {
    /* Only close if clicking on the modal background, not the content */
    if (e.target === productModal) {
      closeProductModal();
    }
  });

  /* Close modal when pressing Escape key */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && productModal.style.display === "flex") {
      closeProductModal();
    }
  });
});
