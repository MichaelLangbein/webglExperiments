WARNING_FLAGS = -Wall -Wextra
COMPILE_FLAGS = -O3


main: main.c
	gcc $(WARNING_FLAGS) $(COMPILE_FLAGS) -o main main.c

wasm: main.c
	clang --target=wasm32 -O3 -flto -nostdlib -Wl,--no-entry -Wl,--export-all -Wl,--allow-undefined -Wl,--lto-O3 -o main.wasm main.c


