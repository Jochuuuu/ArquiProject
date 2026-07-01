#include <stdio.h>

#define N 4

void mirror(int mat[N][N]) {
    for (int i = 0; i < N; i++)
        for (int j = 0; j < N / 2; j++) {
            int tmp = mat[i][j];
            mat[i][j] = mat[i][N - 1 - j];
            mat[i][N - 1 - j] = tmp;
        }
}

int main() {
    int mat[N][N] = {
        { 1,  2,  3,  4},
        { 5,  6,  7,  8},
        { 9, 10, 11, 12},
        {13, 14, 15, 16}
    };

    mirror(mat);

    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++)
            printf("%2d ", mat[i][j]);
        printf("\n");
    }
    // esperado: 4 3 2 1 / 8 7 6 5 / 12 11 10 9 / 16 15 14 13
    return 0;
}
