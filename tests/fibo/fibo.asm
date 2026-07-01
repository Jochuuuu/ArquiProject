# fibonacci recursivo - fib(4) = 3
# resultado guardado en mem[100]
#
# instrucciones 32-bit: addi, sw, lw, beq, blt, jal
# instrucciones 16-bit: c.jal, c.addi, c.add, c.jr
#
# registros:
#   x1  (ra)  = direccion de retorno
#   x2  (sp)  = stack pointer
#   x5  (t0)  = temporal (n-1 para chequeo base)
#   x6  (t1)  = temporal (guarda fib(n-1) para suma)
#   x10 (a0)  = argumento / valor de retorno

# layout de bytes:
#   0  : main
#   20 : fib
#   78 : base_ret

# --- main (byte 0) ---
main:
    addi  x2, x0, 240        # [32-bit] sp = 240
    addi  x10, x0, 4         # [32-bit] a0 = 4 (n a calcular)
    c.jal fib                 # [16-bit] call fib(4), offset=+12
    sw    x10, 100(x0)        # [32-bit] mem[100] = resultado
    beq   x0, x0, 0          # [32-bit] halt

# --- fib(n) (byte 20) ---
# entrada:  a0 = n
# salida:   a0 = fib(n)
fib:
    beq   x10, x0, base_ret  # [32-bit] n==0? retornar (a0=0), offset=+58
    addi  x5, x10, -1        # [32-bit] x5 = n-1
    beq   x5, x0, base_ret   # [32-bit] n==1? retornar (a0=1), offset=+50

    # caso recursivo
    c.addi x2, -12            # [16-bit] reservar stack (ra, n, fib(n-1))
    sw    x1, 8(x2)           # [32-bit] guardar ra
    sw    x10, 4(x2)          # [32-bit] guardar n

    addi  x10, x10, -1       # [32-bit] a0 = n-1
    jal   x1, fib             # [32-bit] a0 = fib(n-1), offset=-26
    sw    x10, 0(x2)          # [32-bit] guardar fib(n-1)

    lw    x10, 4(x2)          # [32-bit] recuperar n
    addi  x10, x10, -2       # [32-bit] a0 = n-2
    jal   x1, fib             # [32-bit] a0 = fib(n-2), offset=-42

    lw    x6, 0(x2)           # [32-bit] t1 = fib(n-1)
    c.add x10, x6             # [16-bit] a0 = fib(n-2) + fib(n-1)

    lw    x1, 8(x2)           # [32-bit] restaurar ra
    c.addi x2, 12             # [16-bit] liberar stack
    c.jr  x1                  # [16-bit] return

# --- base_ret (byte 78) ---
# caso base: n==0 -> a0=0, n==1 -> a0=1 (x10 sin modificar)
# ra y sp no fueron tocados, retornar directo
base_ret:
    c.jr  x1                  # [16-bit] return
