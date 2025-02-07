const API = (() => {
  const URL = "http://localhost:3000";

  const getCart = () => {
    return fetch(`${URL}/cart`)     // use cart url
      .then(response => response.json())
      .catch(error => console.error("Error fetching cart:", error));
  };

  const getInventory = () => {
    return fetch(`${URL}/inventory`)   //use in inventory url
      .then(response => response.json())
      .catch(error => console.error("Error fetching inventory:", error));
  };

  const addToCart = (inventoryItem) => {   
    return fetch(`${URL}/cart`, {     // use post method on cart
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inventoryItem)
    })
    .then(response => response.json())
    .catch(error => console.error("Error adding to cart:", error));
  };

  const updateCart = (id, newAmount) => {
    return fetch(`${URL}/cart/${id}`, {                    // use patch method on cart since we only sending partial data
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: newAmount })
    })
    .then(response => response.json())
    .catch(error => console.error(`Error updating cart item (ID: ${id}):`, error));
  };

  const deleteFromCart = (id) => {
    return fetch(`${URL}/cart/${id}`, { method: "DELETE" })
      .then(response => response.ok)
      .catch(error => console.error(`Error deleting cart item (ID: ${id}):`, error));
  };

  const checkout = () => {
    return getCart().then(data =>
      Promise.all(data.map(item => deleteFromCart(item.id)))
    );
  };

  return { getCart, getInventory, addToCart, updateCart, deleteFromCart, checkout };
})();

const Model = (() => {
  class State {
    #onChange;
    #inventory;
    #cart;

    constructor() {
      this.#inventory = [];
      this.#cart = [];
      this.#onChange = () => {};
    }

    get cart() { return this.#cart; }
    get inventory() { return this.#inventory; }

    set cart(newCart) {
      this.#cart = newCart;
      this.#onChange();
    }

    set inventory(newInventory) {
      this.#inventory = newInventory;
      this.#onChange();
    }

    subscribe(cb) { this.#onChange = cb; }
  }

  return { State, ...API };
})();

const View = (() => {
  const inventoryList = document.querySelector(".inventory__list");
  const cartList = document.querySelector(".cart__list");
  const checkoutButton = document.querySelector(".checkout-btn");

  const renderInventory = (inventory) => {
    inventoryList.innerHTML = "";
    inventory.forEach(item => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${item.content}</span>
        <button class="counter minus" data-id="${item.id}">-</button>
        <span class="amount" data-id="${item.id}">0</span>
        <button class="counter plus" data-id="${item.id}">+</button>
        <button class="add add-to-cart-btn" data-id="${item.id}">Add to Cart</button>
      `;
      inventoryList.appendChild(li);
    });
  };

  const renderCart = (cart) => {
    cartList.innerHTML = "";
    cart.forEach(item => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${item.content} (x<span class="edit-amount" data-id="${item.id}">${item.amount}</span>)</span>
        <button class="delete delete-btn" data-id="${item.id}">delete</button>
        <button class="edit edit-btn" data-id="${item.id}">edit</button>
      `;
      cartList.appendChild(li);
    });
  };

  return { renderInventory, renderCart, checkoutButton };
})();

const Controller = ((model, view) => {
  const state = new model.State();

  const handleAddToCart = () => {
    document.querySelector(".inventory__list").addEventListener("click", (event) => {
      const itemId = parseInt(event.target.getAttribute("data-id"));
      const amountElement = document.querySelector(`.amount[data-id="${itemId}"]`);

      if (!amountElement) return;

      let currentAmount = parseInt(amountElement.innerText, 10);

      if (event.target.classList.contains("plus")) {
        amountElement.innerText = currentAmount + 1;
      }

      if (event.target.classList.contains("minus")) {
        amountElement.innerText = Math.max(0, currentAmount - 1);
      }

      if (event.target.classList.contains("add-to-cart-btn") && currentAmount > 0) {
        const inventoryItem = state.inventory.find(item => item.id === itemId);

        model.getCart().then(cart => {
          const existingCartItem = cart.find(item => item.id === itemId);

          if (existingCartItem) {
            model.updateCart(itemId, existingCartItem.amount + currentAmount)
              .then(() => model.getCart().then(updatedCart => state.cart = updatedCart));
          } else {
            model.addToCart({ id: inventoryItem.id, content: inventoryItem.content, amount: currentAmount })
              .then(() => model.getCart().then(updatedCart => state.cart = updatedCart));
          }
        });

        amountElement.innerText = 0;
      }
    });
  };

  const handleEdit = () => {
    document.querySelector(".cart__list").addEventListener("click", (event) => {
      const itemId = parseInt(event.target.getAttribute("data-id"));
      const cartItemElement = event.target.parentElement;

      if (event.target.classList.contains("edit-btn")) {
        cartItemElement.innerHTML = `
          <span>Editing: </span>
          <button class="counter minus" data-id="${itemId}">-</button>
          <span class="edit-amount" data-id="${itemId}">${state.cart.find(item => item.id === itemId).amount}</span>
          <button class="counter plus" data-id="${itemId}">+</button>
          <button class="save-btn" data-id="${itemId}">save</button>
          
        `;
      }
    });
  };

  const handleEditAmount = () => {
    document.querySelector(".cart__list").addEventListener("click", (event) => {
      const itemId = parseInt(event.target.getAttribute("data-id"));
      const amountElement = document.querySelector(`.edit-amount[data-id="${itemId}"]`);

      if (!amountElement) return;

      if (event.target.classList.contains("plus")) {
        amountElement.innerText = parseInt(amountElement.innerText) + 1;
      }

      if (event.target.classList.contains("minus")) {
        amountElement.innerText = Math.max(1, parseInt(amountElement.innerText) - 1);
      }

      if (event.target.classList.contains("save-btn")) {
        model.updateCart(itemId, parseInt(amountElement.innerText))
          .then(() => model.getCart().then(updatedCart => state.cart = updatedCart));
      }
    });
  };

  const handleDelete = () => {
    document.querySelector(".cart__list").addEventListener("click", (event) => {
      const itemId = parseInt(event.target.getAttribute("data-id"));

      if (event.target.classList.contains("delete-btn")) {
        model.deleteFromCart(itemId).then(() => model.getCart().then(updatedCart => state.cart = updatedCart));
      }
    });
  };

  const handleCheckout = () => {
    view.checkoutButton.addEventListener("click", () => {
      model.checkout().then(() => {
        state.cart = []; // Clear the cart in the UI
        alert("Checkout successful! Your cart is now empty."); // Show success message
      });
    });
  };

  const init = () => {
    model.getInventory().then(data => state.inventory = data);
    model.getCart().then(data => state.cart = data);
    state.subscribe(() => { view.renderInventory(state.inventory); view.renderCart(state.cart); });

    // Attach event listeners
    handleAddToCart();
    handleEdit();
    handleEditAmount();
    handleDelete();
    handleCheckout();
  };

  return { init };
})(Model, View);

Controller.init();
