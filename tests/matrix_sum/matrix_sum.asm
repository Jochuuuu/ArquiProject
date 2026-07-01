# suma de matrices 2x2
# A = [[1,2],[3,4]] en mem[100]
# B = [[5,6],[7,8]] en mem[116]
# C = A+B = [[6,8],[10,12]] en mem[132]
#
# DMEM layout:
#   mem[100] = A[0][0]=1   mem[104] = A[0][1]=2
#   mem[108] = A[1][0]=3   mem[112] = A[1][1]=4
#   mem[116] = B[0][0]=5   mem[120] = B[0][1]=6
#   mem[124] = B[1][0]=7   mem[128] = B[1][1]=8
#   mem[132] = C[0][0]     mem[136] = C[0][1]
#   mem[140] = C[1][0]     mem[144] = C[1][1]
#
# instrucciones 32-bit: addi, sw, lw, add, beq
# instrucciones 16-bit: c.addi, c.add, c.lw, c.sw
#
# registros:
#   x10 (a0) = puntero a A
#   x11 (a1) = puntero a B
#   x12 (a2) = puntero a C
#   x5  (t0) = elemento de A
#   x6  (t1) = elemento de B
#   x7  (t2) = suma

_start:
    addi  x10, x0, 100          # [32-bit] base A = mem[100]
    addi  x11, x0, 116          # [32-bit] base B = mem[116]
    addi  x12, x0, 132          # [32-bit] base C = mem[132]

    # cargar A
    addi  x5, x0, 1             # [32-bit]
    sw    x5, 0(x10)            # [32-bit] A[0][0] = 1
    addi  x5, x0, 2             # [32-bit]
    sw    x5, 4(x10)            # [32-bit] A[0][1] = 2
    addi  x5, x0, 3             # [32-bit]
    sw    x5, 8(x10)            # [32-bit] A[1][0] = 3
    addi  x5, x0, 4             # [32-bit]
    sw    x5, 12(x10)           # [32-bit] A[1][1] = 4

    # cargar B
    addi  x5, x0, 5             # [32-bit]
    sw    x5, 0(x11)            # [32-bit] B[0][0] = 5
    addi  x5, x0, 6             # [32-bit]
    sw    x5, 4(x11)            # [32-bit] B[0][1] = 6
    addi  x5, x0, 7             # [32-bit]
    sw    x5, 8(x11)            # [32-bit] B[1][0] = 7
    addi  x5, x0, 8             # [32-bit]
    sw    x5, 12(x11)           # [32-bit] B[1][1] = 8

    # C[0][0] = A[0][0] + B[0][0]
    lw    x5, 0(x10)            # [32-bit]
    lw    x6, 0(x11)            # [32-bit]
    add   x7, x5, x6            # [32-bit]
    sw    x7, 0(x12)            # [32-bit] C[0][0] = 6

    # C[0][1] = A[0][1] + B[0][1]
    lw    x5, 4(x10)            # [32-bit]
    lw    x6, 4(x11)            # [32-bit]
    add   x7, x5, x6            # [32-bit]
    sw    x7, 4(x12)            # [32-bit] C[0][1] = 8

    # C[1][0] = A[1][0] + B[1][0]
    lw    x5, 8(x10)            # [32-bit]
    lw    x6, 8(x11)            # [32-bit]
    add   x7, x5, x6            # [32-bit]
    sw    x7, 8(x12)            # [32-bit] C[1][0] = 10

    # C[1][1] = A[1][1] + B[1][1]
    lw    x5, 12(x10)           # [32-bit]
    lw    x6, 12(x11)           # [32-bit]
    add   x7, x5, x6            # [32-bit]
    sw    x7, 12(x12)           # [32-bit] C[1][1] = 12

    beq   x0, x0, 0             # [32-bit] halt
