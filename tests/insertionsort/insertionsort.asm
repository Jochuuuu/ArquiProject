# insertion sort in-place
# array {5,3,8,1,9,2,7,4} en mem[100]
# resultado esperado: {1,2,3,4,5,7,8,9}
#
# algoritmo:
#   for i in [1,n):
#     key = arr[i]
#     j = i - 1
#     while j >= 0 && arr[j] > key:
#       arr[j+1] = arr[j]
#       j--
#     arr[j+1] = key
#
# instrucciones 32-bit: addi, sw, lw, add, sub, bge, blt, beq, jal, slli
# instrucciones 16-bit: c.addi, c.add, c.jr, c.beqz
#
# registros:
#   x2  (sp)  = stack pointer
#   x10 (a0)  = base array
#   x11 (a1)  = n = 8
#   x5  (t0)  = i
#   x6  (t1)  = j
#   x7  (t2)  = key = arr[i]
#   x8  (s0)  = arr[j]
#   x9  (s1)  = &arr[j+1]
#   x28 (t3)  = &arr[j]

_start:
    addi  x10, x0, 100          # [32-bit] base = mem[100]
    addi  x11, x0, 8            # [32-bit] n = 8

    # cargar array {5,3,8,1,9,2,7,4}
    addi  x5, x0, 5             # [32-bit]
    sw    x5, 0(x10)            # [32-bit] arr[0] = 5
    addi  x5, x0, 3             # [32-bit]
    sw    x5, 4(x10)            # [32-bit] arr[1] = 3
    addi  x5, x0, 8             # [32-bit]
    sw    x5, 8(x10)            # [32-bit] arr[2] = 8
    addi  x5, x0, 1             # [32-bit]
    sw    x5, 12(x10)           # [32-bit] arr[3] = 1
    addi  x5, x0, 9             # [32-bit]
    sw    x5, 16(x10)           # [32-bit] arr[4] = 9
    addi  x5, x0, 2             # [32-bit]
    sw    x5, 20(x10)           # [32-bit] arr[5] = 2
    addi  x5, x0, 7             # [32-bit]
    sw    x5, 24(x10)           # [32-bit] arr[6] = 7
    addi  x5, x0, 4             # [32-bit]
    sw    x5, 28(x10)           # [32-bit] arr[7] = 4

    addi  x5, x0, 1             # [32-bit] i = 1

_outer:
    bge   x5, x11, _end         # [32-bit] if i >= n fin

    # key = arr[i]
    slli  x28, x5, 2            # [32-bit] i*4
    add   x28, x28, x10         # [32-bit] &arr[i]
    lw    x7, 0(x28)            # [32-bit] key = arr[i]

    addi  x6, x5, -1            # [32-bit] j = i-1

_inner:
    blt   x6, x0, _insert       # [32-bit] if j < 0 insertar

    # arr[j]
    slli  x28, x6, 2            # [32-bit] j*4
    add   x28, x28, x10         # [32-bit] &arr[j]
    lw    x8, 0(x28)            # [32-bit] arr[j]

    blt   x8, x7, _insert       # [32-bit] if arr[j] <= key insertar (no mayor)
    beq   x8, x7, _insert       # [32-bit] if arr[j] == key insertar

    # arr[j+1] = arr[j]
    addi  x9, x28, 4            # [32-bit] &arr[j+1]
    sw    x8, 0(x9)             # [32-bit] arr[j+1] = arr[j]

    c.addi x6, -1               # [16-bit] j--
    jal   x0, _inner            # [32-bit]

_insert:
    # arr[j+1] = key
    addi  x6, x6, 1             # [32-bit] j+1
    slli  x28, x6, 2            # [32-bit] (j+1)*4
    add   x28, x28, x10         # [32-bit] &arr[j+1]
    sw    x7, 0(x28)            # [32-bit] arr[j+1] = key

    c.addi x5, 1                # [16-bit] i++
    jal   x0, _outer            # [32-bit]

_end:
    beq   x0, x0, 0             # [32-bit] halt
