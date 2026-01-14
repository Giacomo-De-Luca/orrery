#!/bin/bash

# Exit on error
set -e

echo "Setting up Rust environment for WASM development..."

# Check if rustup is installed
if ! command -v rustup &> /dev/null; then
    echo "rustup not found. Installing rustup..."
    # Install rustup (standard installer)
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    
    # Source the environment for the current session so we can use it immediately
    if [ -f "$HOME/.cargo/env" ]; then
        source "$HOME/.cargo/env"
    fi
else
    echo "rustup is already installed."
fi

# Ensure we have the cargo environment loaded if it exists
if [ -f "$HOME/.cargo/env" ]; then
    source "$HOME/.cargo/env"
fi

# Add the WASM target
echo "Adding wasm32-unknown-unknown target..."
rustup target add wasm32-unknown-unknown

# Install wasm-bindgen-cli
# We need a specific version to match the Cargo.toml dependency (0.2.100)
echo "Installing wasm-bindgen-cli v0.2.100..."
if ! command -v wasm-bindgen &> /dev/null; then
    cargo install wasm-bindgen-cli --version 0.2.100
else
    current_version=$(wasm-bindgen --version | cut -d' ' -f2)
    if [ "$current_version" != "0.2.100" ]; then
        echo "wasm-bindgen version mismatch (found $current_version, need 0.2.100). Installing correct version..."
        cargo install wasm-bindgen-cli --version 0.2.100 --force
    else
        echo "wasm-bindgen-cli v0.2.100 is already installed."
    fi
fi

echo ""
echo "✅ Rust setup complete!"
echo "To configure your current shell, run:"
echo "source \"$HOME/.cargo/env\""
