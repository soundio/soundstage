DEBUG=

# Tell make to ignore existing folders and allow overwriting existing files
.PHONY: modules literal rust

# Must format with tabs not spaces
literal:
	deno run --allow-read --allow-env --allow-net --allow-write --allow-run --unstable ./static/literal/deno/make-literal.js ./static/soundio/

rust:
	@for dir in $$(find ./ -name "src" -type d -exec dirname {} \;); do \
		if [ -f "$$dir/Cargo.toml" ]; then \
			echo "Building $$dir"; \
			(cd $$dir && wasm-pack build --target web --release); \
		fi; \
	done

modules:
	rm -rf ./build
	deno run --allow-read --allow-env --allow-net --allow-write --allow-run ../fn/deno/make-modules.js static/build/ ./module.js
