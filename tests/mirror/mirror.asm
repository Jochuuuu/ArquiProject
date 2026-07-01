# espejo horizontal de matriz 4x4
# voltea cada fila: columna j <-> columna (n-1-j)
# matriz en mem[100], n=4 (4x4 = 16 words = 64 bytes)
#
# entrada (row-major en mem[100..163]):
#   fila 0: [1, 2, 3, 4]
#   fila 1: [5, 6, 7, 8]
#   fila 2: [9,10,11,12]
#   fila 3: [13,14,15,16]
#
# salida esperada:
#   fila 0: [4, 3, 2, 1]
#   fila 1: [8, 7, 6, 5]
#   fila 2: [12,11,10, 9]
#   fila 3: [16,15,14,13]
#
# sin mul: calculo fila*n con sumas (n=4, maximo 4 sumas)
#
# instrucciones 32-bit: addi, sw, lw, add, sub, bge, beq, jal
# instrucciones 16-bit: c.addi, c.add, c.jr, c.beqz, c.bnez
#
# registros:
#   x2  (sp)  = stack pointer
#   x10 (a0)  = base matriz
#   x11 (a1)  = n = 4
#   x5  (t0)  = i (fila)
#   x6  (t1)  = j (columna, 0..n/2-1)
#   x7  (t2)  = &mat[i][j]
#   x8  (s0)  = &mat[i][n-1-j]
#   x9  (s1)  = tmp para swap
#   x28 (t3)  = i*n acumulado (sin mul)
#   x29 (t4)  = temporal suma
#   x30 (t5)  = limite j < n/2

# layout bytes IMEM:
#   0   : _start
#   108 : _loop_i
#   116 : _loop_j
#   164 : _next_j
#   172 : _next_i

_start:
    addi  x10, x0, 100          # [32-bit] base = mem[100]
    addi  x11, x0, 4            # [32-bit] n = 4

    # cargar matriz fila 0
    addi  x5, x0, 1             # [32-bit]
    sw    x5, 0(x10)            # [32-bit] [0][0]=1
    addi  x5, x0, 2             # [32-bit]
    sw    x5, 4(x10)            # [32-bit] [0][1]=2
    addi  x5, x0, 3             # [32-bit]
    sw    x5, 8(x10)            # [32-bit] [0][2]=3
    addi  x5, x0, 4             # [32-bit]
    sw    x5, 12(x10)           # [32-bit] [0][3]=4
    # fila 1
    addi  x5, x0, 5             # [32-bit]
    sw    x5, 16(x10)           # [32-bit] [1][0]=5
    addi  x5, x0, 6             # [32-bit]
    sw    x5, 20(x10)           # [32-bit] [1][1]=6
    addi  x5, x0, 7             # [32-bit]
    sw    x5, 24(x10)           # [32-bit] [1][2]=7
    addi  x5, x0, 8             # [32-bit]
    sw    x5, 28(x10)           # [32-bit] [1][3]=8
    # fila 2
    addi  x5, x0, 9             # [32-bit]
    sw    x5, 32(x10)           # [32-bit] [2][0]=9
    addi  x5, x0, 10            # [32-bit]
    sw    x5, 36(x10)           # [32-bit] [2][1]=10
    addi  x5, x0, 11            # [32-bit]
    sw    x5, 40(x10)           # [32-bit] [2][2]=11
    addi  x5, x0, 12            # [32-bit]
    sw    x5, 44(x10)           # [32-bit] [2][3]=12
    # fila 3
    addi  x5, x0, 13            # [32-bit]
    sw    x5, 48(x10)           # [32-bit] [3][0]=13
    addi  x5, x0, 14            # [32-bit]
    sw    x5, 52(x10)           # [32-bit] [3][1]=14
    addi  x5, x0, 15            # [32-bit]
    sw    x5, 56(x10)           # [32-bit] [3][2]=15
    addi  x5, x0, 16            # [32-bit]
    sw    x5, 60(x10)           # [32-bit] [3][3]=16

    addi  x5, x0, 0             # [32-bit] i = 0
    addi  x28, x0, 0            # [32-bit] i*n = 0 (sin mul, suma acumulada)

_loop_i:
    bge   x5, x11, _end         # [32-bit] if i >= n fin
    addi  x6, x0, 0             # [32-bit] j = 0
    srli  x30, x11, 1           # [32-bit] limite = n/2 = 2

_loop_j:
    bge   x6, x30, _next_i      # [32-bit] if j >= n/2 siguiente fila

    # addr(i,j)     = base + (i*n + j)*4
    # addr(i,n-1-j) = base + (i*n + n-1-j)*4
    # i*n ya esta en x28 (acumulado)

    # calcular offset j: x28 + j
    add   x29, x28, x6          # [32-bit] x29 = i*n + j
    slli  x7, x29, 2            # [32-bit] byte offset
    add   x7, x7, x10           # [32-bit] &mat[i][j]

    # calcular offset n-1-j
    addi  x29, x11, -1          # [32-bit] x29 = n-1
    sub   x29, x29, x6          # [32-bit] x29 = n-1-j
    add   x29, x29, x28         # [32-bit] x29 = i*n + (n-1-j)
    slli  x8, x29, 2            # [32-bit] byte offset
    add   x8, x8, x10           # [32-bit] &mat[i][n-1-j]

    # swap
    lw    x9, 0(x7)             # [32-bit] tmp = mat[i][j]
    lw    x29, 0(x8)            # [32-bit] tmp2 = mat[i][n-1-j]
    sw    x29, 0(x7)            # [32-bit] mat[i][j] = tmp2
    sw    x9, 0(x8)             # [32-bit] mat[i][n-1-j] = tmp

    c.addi x6, 1                # [16-bit] j++
    jal   x0, _loop_j           # [32-bit]

_next_i:
    c.addi x5, 1                # [16-bit] i++
    add   x28, x28, x11         # [32-bit] i*n += n (siguiente fila)
    jal   x0, _loop_i           # [32-bit]

_end:
    beq   x0, x0, 0             # [32-bit] halt
