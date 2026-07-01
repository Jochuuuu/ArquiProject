#include <stdio.h>

// Calcula fib(n) de forma recursiva.
// Equivalente al programa ensamblado en fibo.asm / fibo.mem.
// Resultado esperado: fib(4) = 3
//   fib(0)=0, fib(1)=1, fib(2)=1, fib(3)=2, fib(4)=3

int fib(int n) {
    if (n < 2)
        return n;
    return fib(n - 1) + fib(n - 2);
}

int main(void) {
    int n = 4;
    int resultado = fib(n);
    printf("fib(%d) = %d\n", n, resultado);  // fib(4) = 3
    return 0;
}
