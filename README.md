# Image Printer App

This is a standalone-based static-js image printer app that allows users to create and print images with text, borders, and QR codes.

Used to create templates for printing on the Cannon Selphy-CP1500 printer.

## Features

- Add images
  - Scales
  - Rotation
- Add text
- Add QR codes
- Add borders
  - Border thickness
  - Border color
  - Corner radius
- Add margins
- Saves and loads templates

## Technologies Used

- **React**: A JavaScript library for building user interfaces.
- **TypeScript**: A strongly typed superset of JavaScript that compiles to plain JavaScript.
- **Vite**: A fast build tool that provides an excellent developer experience.
- **Bun**: A fast all-in-one JavaScript runtime.
- **Konva & React Konva**: For high-performance 2D transformations on canvas.
- **QR Code**: For generating QR codes.
- **React Color**: A collection of color pickers from Sketch, Photoshop, Chrome, Github, Twitter & more.
- **React To Print**: For printing React components in the browser.

## Setup and Running the Project

To set up and run this project locally, follow these steps:

1.  **Clone the repository:**

    ```bash
    git clone [repository-url]
    cd image-printer
    ```

2.  **Install dependencies:**

    ```bash
    bun install
    ```

3.  **Run the development server:**

    ```bash
    bun dev
    ```

    The application will be available at `http://localhost:5173`.

4.  **Build for production:**

    ```bash
    bun run build
    ```

5.  **Preview the production build:**
    ```bash
    bun run preview
    ```

```

```
