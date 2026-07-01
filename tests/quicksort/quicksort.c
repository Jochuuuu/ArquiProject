// quicksort recursivo in-place
// array {6,4,3,2,1,8,9} en dir 0x1000
// resultado ordenado {1,2,3,4,6,8,9} en misma direccion
//
// convencion RISC-V:
//   a0=arr (puntero), a1=l (indice izq), a2=r (indice der, exclusivo)
//   _partition retorna indice del pivot final en a0

int arr[7] = {6, 4, 3, 2, 1, 8, 9};

// particion con ultimo elemento como pivot (arr[r-1])
// retorna posicion final del pivot
// q es el indice del primer elemento >= pivot al terminar
int _partition(int *a, int l, int r) {
    int pivot = a[r - 1];
    int q = l;
    for (int i = l; i < r; i++) {
        if (a[i] < pivot) {
            int tmp = a[q];
            a[q] = a[i];
            a[i] = tmp;
            q++;
        }
    }
    // intercambiar pivot a su posicion final
    int tmp = a[q];
    a[q] = a[r - 1];
    a[r - 1] = tmp;
    return q;
}

// quicksort(arr, l, r) donde [l, r) es el rango exclusivo
void _qsort(int *a, int l, int r) {
    if (l >= r) return;
    int q = _partition(a, l, r);
    _qsort(a, l, q);
    _qsort(a, q + 1, r);
}

int main() {
    _qsort(arr, 0, 7);
    // arr queda {1,2,3,4,6,8,9} en 0x1000
    return 0;
}
