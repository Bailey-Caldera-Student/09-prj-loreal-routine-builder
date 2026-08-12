/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const generateRoutineBtn = document.getElementById("generateRoutine");
const userInput = document.getElementById("userInput");

/* Array to store selected products */
let selectedProducts = [];

/* Array to store conversation history for OpenAI */
let messages = [];

/* Cloudflare Worker URL for OpenAI API calls */
const WORKER_URL = "https://chat-worker.bailey-caldera1070.workers.dev/";

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
    displayMessageInChat("assistant", "Sorry, I encountered an error. Please try again.");
  }
}

/* Display a message in the chat window */
function displayMessageInChat(role, content) {
  /* Create a message element with role-specific styling */
  const messageDiv = document.createElement("div");
  messageDiv.className = `chat-message ${role}`;

  /* Add the message content */
  messageDiv.innerHTML = `
    <p>${content}</p>
  `;

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
    displayMessageInChat("assistant", "Please select at least one product before generating a routine.");
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
        "You are a knowledgeable L'Oréal skincare and beauty advisor. Help users build personalized beauty routines using the products they select. Provide practical, friendly advice tailored to their chosen products.",
    });
  }

  /* Create the user's initial request for routine generation */
  const routineRequest = `Please create a personalized daily beauty routine using these products: ${productList}. Include morning and evening steps with brief explanations for each product's use.`;

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
