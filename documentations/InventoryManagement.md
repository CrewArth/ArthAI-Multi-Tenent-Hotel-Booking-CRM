# Inventory Management — Refined Flow

## SUPER ADMIN

### 1. Add Item

* Instead of displaying the item creation form directly, show an **"Add Item"** button.
* On clicking **Add Item**, open a **popup/modal** containing the form for adding a new item.
* The form should include fields such as:

  * Item Name
  * Price
  * Quantity
  * Cost Price
  * Unit
  * Other relevant inventory details

### 2. Unit / Piece Dropdown

* Do not keep **Piece** as a text field.
* Make the **Unit** field a dropdown.
* Add the unit values in `svgutils.js` as an **array of objects**.
* The array should contain values such as:

  * Piece
  * Dozen
  * etc.
* The dropdown should use these values from `svgutils.js`.

### 3. Item Request

In the **Item Request** section:

* List all item requests received from hotels.
* Each request should have two actions:

  * **Approve**
  * **Cancel**

---

# HOTEL ADMIN

## 1. Direct Issue

When the **Direct Issue** tab is opened:

### Current Inventory Table

* List all the **currently available items** for that hotel in a table.
* The admin should **not directly issue an item from this table**.
* Each item should have a **checkbox** for selection.
* The admin can select one or multiple items.

### Selected Items Table

Below the current inventory table, add a second table containing the **selected items**.

In this table:

* Display the selected items.
* Allow the Hotel Admin to update the **Price** before issuing.
* The selected items can then be **Directly Issued**.

> **Important:** Direct Issue should happen only after selecting items and reviewing/updating them in the second table.

---

## 2. Item Request

When the **Item Request** tab is opened:

### Available Items Table

* By default, **nothing should be selected**.
* Display the available items in a table.
* Each item should have a **checkbox**.
* The Hotel Admin can select one or multiple items.

### Selected Items Table

Below the available items table, add a second table containing the **selected items**.

In this table:

* Display the selected items.
* Allow the Hotel Admin to update the **Price**.
* The selected items can then be sent as an **Item Request** to the SuperAdmin.

The flow should be:

**Select Items → Selected Items Table → Update Price if Required → Send Request**

---

# IMPORTANT PRICE / COST PRICE RULE

### SuperAdmin

SuperAdmin can view and manage:

* Price
* Cost Price

### Hotel Admin

**Do NOT display Cost Price anywhere in the Hotel Admin interface.**

Hotel Admin should only see and be able to update:

* **Price**

The **Cost Price field must remain completely hidden from Hotel Admin**, including in:

* Current inventory table
* Selected items table
* Direct Issue flow
* Item Request flow
* Any item details displayed to Hotel Admin

Only the **Price** field should be visible to Hotel Admin.
