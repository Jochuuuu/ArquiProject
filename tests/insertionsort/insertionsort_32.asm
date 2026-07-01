# insertionsort_32.asm -- version equivalente con SOLO instrucciones de 32 bits
# Misma logica que insertionsort.asm pero sin ninguna instruccion RVC.
# Resultado esperado: mem[100..128] = {1,2,3,4,5,7,8,9}
#
# Cambios respecto a insertionsort.asm:
#   c.addi x6, -1  -> addi x6, x6, -1
#   c.addi x5, 1   -> addi x5, x5, 1
#
# Los offsets de jal siguen igual porque las dos c.addi
# que se reemplazan estan al final de los bucles y
# los saltos apuntan a etiquetas, no a offsets fijos.

_start:
    addi  x10, x0, 100           # base = mem[100]
    addi  x11, x0, 8             # n = 8

    # cargar array {5,3,8,1,9,2,7,4}
    addi  x5, x0, 5
    sw    x5, 0(x10)             # arr[0] = 5
    addi  x5, x0, 3
    sw    x5, 4(x10)             # arr[1] = 3
    addi  x5, x0, 8
    sw    x5, 8(x10)             # arr[2] = 8
    addi  x5, x0, 1
    sw    x5, 12(x10)            # arr[3] = 1
    addi  x5, x0, 9
    sw    x5, 16(x10)            # arr[4] = 9
    addi  x5, x0, 2
    sw    x5, 20(x10)            # arr[5] = 2
    addi  x5, x0, 7
    sw    x5, 24(x10)            # arr[6] = 7
    addi  x5, x0, 4
    sw    x5, 28(x10)            # arr[7] = 4

    addi  x5, x0, 1              # i = 1

_outer:
    bge   x5, x11, _end          # if i >= n fin

    slli  x28, x5, 2             # i*4
    add   x28, x28, x10          # &arr[i]
    lw    x7,  0(x28)            # key = arr[i]

    addi  x6, x5, -1             # j = i-1

_inner:
    blt   x6, x0, _insert        # if j < 0 insertar

    slli  x28, x6, 2             # j*4
    add   x28, x28, x10          # &arr[j]
    lw    x8,  0(x28)            # arr[j]

    blt   x8, x7, _insert        # if arr[j] < key insertar
    beq   x8, x7, _insert        # if arr[j] == key insertar

    addi  x9, x28, 4             # &arr[j+1]
    sw    x8, 0(x9)              # arr[j+1] = arr[j]

    addi  x6, x6, -1             # j--    (era c.addi x6, -1)
    jal   x0, _inner

_insert:
    addi  x6, x6, 1              # j+1
    slli  x28, x6, 2             # (j+1)*4
    add   x28, x28, x10          # &arr[j+1]
    sw    x7,  0(x28)            # arr[j+1] = key

    addi  x5, x5, 1              # i++    (era c.addi x5, 1)
    jal   x0, _outer

_end:
    beq   x0, x0, 0              # halt
