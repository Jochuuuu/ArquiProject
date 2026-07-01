# quicksort recursivo in-place
# array {6,4,3,2,1,8,9} en mem[100] = byte 0x64
# sp = 0xE0 (224), stack crece hacia abajo
#
# DMEM: 64 words = bytes 0x00..0xFF
#   array:  bytes 0x64..0x7F  (words 25..31)
#   stack:  bytes 0xC0..0xDF  (encima del array, crece hacia abajo desde 0xE0)
#
# instrucciones 32-bit: addi, sw, lw, slli, bge, blt, beq, jal
# instrucciones 16-bit: c.addi, c.add, c.jr
#
# registros:
#   x1  (ra)  = direccion de retorno
#   x2  (sp)  = stack pointer (0xE0 = 224)
#   x5  (t0)  = pivot
#   x6  (t1)  = i (loop counter)
#   x7  (t2)  = &arr[i]
#   x8  (s0)  = guardado: arr base
#   x9  (s1)  = guardado: l / q
#   x10 (a0)  = arg/ret: arr base
#   x11 (a1)  = arg: l (izq) / q (tras partition)
#   x12 (a2)  = arg: r (der, exclusivo)
#   x18 (s2)  = guardado: r
#   x28 (t3)  = arr[i]
#   x29 (t4)  = &arr[q]
#   x30 (t5)  = arr[q]
#
# layout de bytes (IMEM):
#   0   : _start
#   80  : _qsort
#   172 : _qsort_end
#   174 : _partition
#   188 : _for_begin
#   228 : _if_end
#   236 : _for_end

# --- _start (byte 0) ---
_start:
    addi  x2, x0, 512          # [32-bit] sp = 0x200 (fuera de DMEM, stack no pisa datos)
    addi  x10, x0, 100         # [32-bit] a0 = 0x64 (base del array)
    addi  x6, x0, 6            # [32-bit]
    sw    x6, 0(x10)           # [32-bit] arr[0] = 6
    addi  x6, x0, 4            # [32-bit]
    sw    x6, 4(x10)           # [32-bit] arr[1] = 4
    addi  x6, x0, 3            # [32-bit]
    sw    x6, 8(x10)           # [32-bit] arr[2] = 3
    addi  x6, x0, 2            # [32-bit]
    sw    x6, 12(x10)          # [32-bit] arr[3] = 2
    addi  x6, x0, 1            # [32-bit]
    sw    x6, 16(x10)          # [32-bit] arr[4] = 1
    addi  x6, x0, 8            # [32-bit]
    sw    x6, 20(x10)          # [32-bit] arr[5] = 8
    addi  x6, x0, 9            # [32-bit]
    sw    x6, 24(x10)          # [32-bit] arr[6] = 9
    addi  x11, x0, 0           # [32-bit] l = 0
    addi  x12, x0, 7           # [32-bit] r = 7
    jal   x1, _qsort           # [32-bit] call _qsort(arr,0,7), off=+8
_end:
    beq   x0, x0, 0            # [32-bit] halt

# --- _qsort(a0=arr, a1=l, a2=r) (byte 80) ---
_qsort:
    bge   x11, x12, _qsort_end # [32-bit] if l>=r return, off=+92
    c.addi x2, -16              # [16-bit] reservar stack (16 bytes)
    sw    x1, 12(x2)            # [32-bit] guardar ra
    sw    x8, 8(x2)             # [32-bit] guardar s0
    sw    x9, 4(x2)             # [32-bit] guardar s1
    sw    x18, 0(x2)            # [32-bit] guardar s2
    addi  x8, x10, 0            # [32-bit] s0 = arr
    addi  x9, x11, 0            # [32-bit] s1 = l
    addi  x18, x12, 0           # [32-bit] s2 = r
    jal   x1, _partition        # [32-bit] a0 = partition(arr,l,r), off=+60
    addi  x12, x10, 0           # [32-bit] a2 = q
    addi  x11, x9, 0            # [32-bit] a1 = l
    addi  x9, x10, 0            # [32-bit] s1 = q (guardar)
    addi  x10, x8, 0            # [32-bit] a0 = arr
    jal   x1, _qsort            # [32-bit] qsort(arr,l,q), off=-54
    addi  x12, x18, 0           # [32-bit] a2 = r
    addi  x11, x9, 1            # [32-bit] a1 = q+1
    addi  x10, x8, 0            # [32-bit] a0 = arr
    jal   x1, _qsort            # [32-bit] qsort(arr,q+1,r), off=-70
    lw    x1, 12(x2)            # [32-bit] restaurar ra
    lw    x8, 8(x2)             # [32-bit] restaurar s0
    lw    x9, 4(x2)             # [32-bit] restaurar s1
    lw    x18, 0(x2)            # [32-bit] restaurar s2
    c.addi x2, 16               # [16-bit] liberar stack
_qsort_end:
    c.jr  x1                    # [16-bit] ret

# --- _partition(a0=arr, a1=l, a2=r) (byte 174) ---
# pivot = arr[r-1], q = l
# for i in [l,r): if arr[i]<pivot swap(arr[i],arr[q]); q++
# retorna q-1
_partition:
    slli  x5, x12, 2            # [32-bit] t0 = r*4
    c.add x5, x10               # [16-bit] t0 = arr + r*4  (&arr[r])
    lw    x5, -4(x5)            # [32-bit] pivot = arr[r-1]
    addi  x6, x11, 0            # [32-bit] i = l
_for_begin:
    bge   x6, x12, _for_end     # [32-bit] if i>=r goto _for_end, off=+48
    slli  x7, x6, 2             # [32-bit] t2 = i*4
    c.add x7, x10               # [16-bit] t2 = arr + i*4  (&arr[i])
    lw    x28, 0(x7)            # [32-bit] t3 = arr[i]
    blt   x5, x28, _if_end      # [32-bit] if pivot<arr[i] skip, off=+26
    slli  x29, x11, 2           # [32-bit] t4 = q*4
    c.add x29, x10              # [16-bit] t4 = arr + q*4  (&arr[q])
    lw    x30, 0(x29)           # [32-bit] t5 = arr[q]
    sw    x30, 0(x7)            # [32-bit] arr[i] = arr[q]
    sw    x28, 0(x29)           # [32-bit] arr[q] = arr[i]
    addi  x11, x11, 1           # [32-bit] q++
_if_end:
    addi  x6, x6, 1             # [32-bit] i++
    jal   x0, _for_begin        # [32-bit] j _for_begin, off=-44
_for_end:
    addi  x10, x11, -1         # [32-bit] a0 = q-1 (posicion pivot)
    c.jr  x1                    # [16-bit] ret
