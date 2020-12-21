# Gcc
WARNING_FLAGS = -Wall -Wextra
COMPILE_FLAGS = -O3

# LLVM / Wasm
WASM_COMPILE_FLAGS = --target=wasm32 -O3 -flto -nostdlib -Wl,--no-entry -Wl,--export-all -Wl,--allow-undefined -Wl,--lto-O3 -Wl,--import-memory


main: main.c
	gcc $(WARNING_FLAGS) $(COMPILE_FLAGS) -o main main.c

wasm: main.c
	clang $(WASM_COMPILE_FLAGS) -o main.wasm main.c

deploy: wasm
	mv main.wasm ../../assets/marchingCubes.wasm
