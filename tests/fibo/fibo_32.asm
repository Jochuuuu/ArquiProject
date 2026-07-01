# fibo_32.asm -- version equivalente con SOLO instrucciones de 32 bits
# Misma logica que fibo.asm pero sin ninguna instruccion RVC.
# Resultado esperado: mem[100] = 3
#
# Cambios respecto a fibo.asm:
#   c.jal fib      -> jal  x1, fib      (32-bit, guarda ra en x1)
#   c.addi x2, -12 -> addi x2, x2, -12
#   c.add  x10, x6 -> add  x10, x10, x6
#   c.addi x2, 12  -> addi x2, x2, 12
#   c.jr   x1      -> jalr x0, 0(x1)
#
# NOTA: los offsets de jal/beq cambian porque las instrucciones
# que antes eran de 2 bytes ahora son de 4 bytes.
# Recalcular offsets al ensamblar.

main:
    addi  x2,  x0, 240       # sp = 240
    addi  x10, x0, 4         # a0 = 4
    jal   x1,  fib            # call fib(4)        (era c.jal)
    sw    x10, 100(x0)        # mem[100] = resultado
    beq   x0,  x0, 0         # halt

fib:
    beq   x10, x0,  base_ret  # n==0? return
    addi  x5,  x10, -1        # x5 = n-1
    beq   x5,  x0,  base_ret  # n==1? return

    addi  x2,  x2, -12        # reservar stack      (era c.addi x2, -12)
    sw    x1,  8(x2)           # guardar ra
    sw    x10, 4(x2)           # guardar n

    addi  x10, x10, -1        # a0 = n-1
    jal   x1,  fib             # a0 = fib(n-1)
    sw    x10, 0(x2)           # guardar fib(n-1)

    lw    x10, 4(x2)           # recuperar n
    addi  x10, x10, -2        # a0 = n-2
    jal   x1,  fib             # a0 = fib(n-2)

    lw    x6,  0(x2)           # t1 = fib(n-1)
    add   x10, x10, x6         # a0 = fib(n-1)+fib(n-2)  (era c.add x10,x6)

    lw    x1,  8(x2)           # restaurar ra
    addi  x2,  x2, 12          # liberar stack       (era c.addi x2, 12)
    jalr  x0,  0(x1)           # return              (era c.jr x1)

base_ret:
    jalr  x0,  0(x1)           # return              (era c.jr x1)
