// ictest2_32.asm -- version equivalente con SOLO instrucciones de 32 bits
// Misma logica que ictest2.asm pero sin ninguna instruccion RVC.
// Todas las instrucciones son de 4 bytes; los offsets de salto cambian.
// Resultado esperado: mem[100] = 25
//
// Mapa de direcciones (cada instruccion = 4 bytes):
//   0x00: addi x2, x0, 0
//   0x04: addi x8, x0, 96
//   0x08: addi x9, x0, 25
//   0x0C: sw   x9, 0(x8)          (era c.sw)
//   0x10: lw   x10, 0(x8)         (era c.lw)
//   0x14: sw   x10, 104(x2)       (era c.swsp)
//   0x18: lw   x11, 104(x2)       (era c.lwsp)
//   0x1C: addi x12, x0, 0
//   0x20: beq  x12, x0, +8        (era c.beqz -> salta a 0x28)
//   0x24: addi x1, x1, 3          NO debe ejecutarse
//   0x28: bne  x10, x0, +8        (era c.bnez -> salta a 0x30)
//   0x2C: addi x1, x1, 3          NO debe ejecutarse
//   0x30: jal  x0, +8             (era c.j    -> salta a 0x38)
//   0x34: addi x1, x1, 3          NO debe ejecutarse
//   0x38: jal  x1, +8             (era c.jal  -> salta a 0x40)
//   0x3C: addi x1, x1, 3          NO debe ejecutarse
//   0x40: addi x6, x0, 72         x6=0x48 (direccion del sw abajo)
//   0x44: jalr x0, 0(x6)          (era c.jr  -> salta a 0x48)
//   0x48: addi x1, x1, 3          NO debe ejecutarse
//   0x4C: addi x7, x0, 84         x7=0x54 (direccion del sw abajo)
//   0x50: jalr x1, 0(x7)          (era c.jalr -> salta a 0x54)
//   0x54: sw   x10, 100(x0)       mem[100] = 25
//   0x58: beq  x0, x0, 0          halt

    addi  x2,  x0, 0
    addi  x8,  x0, 96
    addi  x9,  x0, 25

    sw    x9,  0(x8)          // mem[96] = 25       (era c.sw)
    lw    x10, 0(x8)          // x10 = 25           (era c.lw)
    sw    x10, 104(x2)        // mem[104] = 25      (era c.swsp)
    lw    x11, 104(x2)        // x11 = 25           (era c.lwsp)

    addi  x12, x0, 0

    beq   x12, x0, +8         // salta a 0x28       (era c.beqz)
    addi  x1,  x1, 3          // NO debe ejecutarse
    bne   x10, x0, +8         // salta a 0x30       (era c.bnez)
    addi  x1,  x1, 3          // NO debe ejecutarse
    jal   x0,  +8             // salta a 0x38       (era c.j)
    addi  x1,  x1, 3          // NO debe ejecutarse
    jal   x1,  +8             // salta a 0x40       (era c.jal)
    addi  x1,  x1, 3          // NO debe ejecutarse

    addi  x6,  x0, 72         // x6 = 0x48
    jalr  x0,  0(x6)          // salta a 0x48       (era c.jr)
    addi  x1,  x1, 3          // NO debe ejecutarse

    addi  x7,  x0, 84         // x7 = 0x54
    jalr  x1,  0(x7)          // salta a 0x54       (era c.jalr)

    sw    x10, 100(x0)        // mem[100] = 25
    beq   x0,  x0, 0          // halt
