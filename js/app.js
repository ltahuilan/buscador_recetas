const categoriasSelect = document.querySelector('#categorias');
const resultado = document.querySelector('#resultado');
let categoria;
//instancia de la clase Modal de bootstrap, la cual esta disponible en la ventana global
const modal = new bootstrap.Modal('#modal', {});

function iniciarApp() {
    if(categoriasSelect) {
        categoriasSelect.addEventListener('change', seleccionarCategoria);
        obtenerCategorias();
        return;
    }

    mostrarFavoritos();
}

function obtenerCategorias() {
    const url = 'https://www.themealdb.com/api/json/v1/1/categories.php';
    //fetch a la url
    fetch(url)
        .then(response => response.json())
        .then(result => mostrarCategorias(result.categories));
}

function mostrarCategorias(categorias = []) {
    categorias.forEach(categoria => {
        const { strCategory } = categoria;
        const option = document.createElement('OPTION');
        option.value = strCategory;
        option.textContent = strCategory;
        categoriasSelect.appendChild(option);
    })
}

function seleccionarCategoria(event) {
    //variable categoria definada en ámbito global
    categoria = event.target.value;
    const url = `https://www.themealdb.com/api/json/v1/1/filter.php?c=${categoria}`;
    //fetch a la url
    fetch(url)
        .then(response => response.json())
        .then(result => mostrarRecetas(result.meals))
}

function mostrarRecetas(recetas = []) {
    limpiarHtml(resultado);

    if(categoriasSelect) {
        //mostrar un texto de forma condicional en función de si hay o no resultados
        const resultadosHeading = document.createElement('H4');
        resultadosHeading.classList.add('text-center', 'fw-semibold', 'mb-4');
        resultadosHeading.innerHTML = recetas.length ? `Recetas encontradas para <span class="fw-light fs-3">${categoria}</span>` : 'No hay recetas para mostrar';
        resultado.appendChild(resultadosHeading);
    }

    recetas.forEach(receta => {
        const { idMeal, strMeal, strMealThumb } = receta;
        const recetaContenedor = document.createElement('DIV');
        recetaContenedor.classList.add('col-md-4', 'mb-4');

        const cardContenedor = document.createElement('DIV');
        cardContenedor.classList.add('card');

        const imgThumb = document.createElement('IMG');
        imgThumb.classList.add('card-img-top');
        imgThumb.src = strMealThumb ?? receta.imagen;
        imgThumb.alt = `img alt de la receta ${strMeal ?? receta.imagen}`;

        const cardBody = document.createElement('DIV');
        cardBody.classList.add('card-body');

        const cardTitle = document.createElement('H3');
        cardTitle.classList.add('card-title', 'mb-3');
        cardTitle.textContent = strMeal ?? receta.titulo;

        const cardButton = document.createElement('BUTTON');
        cardButton.classList.add('btn', 'btn-danger', 'w-100');
        cardButton.textContent = 'Ver receta';
        cardButton.onclick = () => {
            seleccionarReceta(idMeal ?? receta.id);
        }

        cardBody.appendChild(cardTitle);
        cardBody.appendChild(cardButton);
        cardContenedor.appendChild(imgThumb);
        cardContenedor.appendChild(cardBody);
        recetaContenedor.appendChild(cardContenedor);
        resultado.appendChild(recetaContenedor);
    });

}

function seleccionarReceta(id) {
    const url = `https://themealdb.com/api/json/v1/1/lookup.php?i=${id}`;
    fetch(url)
        .then(response => response.json())
        .then(result => mostrarModalReceta(result.meals[0]))
}

function mostrarModalReceta(receta) {
    const { idMeal, strMealThumb, strInstructions, strMeal } = receta;
    const modalTitle = document.querySelector('.modal-title');
    modalTitle.textContent = strMeal;
    const modalBody = document.querySelector('.modal-body');
    modalBody.innerHTML =
        `
            <img src="${strMealThumb}" alt="img alt ${strMeal}" class="img-fluid" />
            <h3 class="my-4">Instrucciones:</h3>
            <p class="">${strInstructions}</p>
            <h3 class="my-4">Ingredientes y cantidades:</h3>
        `;

    //mostrar ingredientes y cantidades
    const ingredienteList = document.createElement('UL');
    ingredienteList.classList.add('list-group');
    for (let i = 1; i <= 20; i++) {
        if (receta[`strIngredient${i}`]) {
            const ingrediente = receta[`strIngredient${i}`];
            const cantidad = receta[`strMeasure${i}`];
            const ingredienteItem = document.createElement('LI');
            ingredienteItem.classList.add('list-group-item');
            ingredienteItem.textContent = `${ingrediente} - ${cantidad}`;

            ingredienteList.appendChild(ingredienteItem);
            modalBody.appendChild(ingredienteList);
        }
    }

    //botones de guardar favorito y cerrar
    const btnGuardarFavorito = document.createElement('BUTTON');

    if(recetaExisteStorage(idMeal)){
        btnGuardarFavorito.classList.add('btn-guardar', 'btn', 'btn-danger', 'col')
    }else {
        btnGuardarFavorito.classList.add('btn-guardar', 'btn', 'btn-primary', 'col');
    }
    btnGuardarFavorito.textContent = recetaExisteStorage(idMeal) ? 'Eliminar de Favoritos' : 'Agregar a Favoritos';
    btnGuardarFavorito.onclick = () => {
        //si la receta ya existe en local storage romper el flujo
        if (recetaExisteStorage(idMeal)) {
            btnGuardarFavorito.classList.remove('btn-primary');
            btnGuardarFavorito.classList.add('btn-danger');
            eliminarFavorito(idMeal);
            mostrarToast('Receta eliminada de favoritos');
            return;
        }

        guardarFavorito({
            id: idMeal,
            titulo: strMeal,
            imagen: strMealThumb
        });
        btnGuardarFavorito.textContent = 'Eliminar de Favoritos';
        btnGuardarFavorito.classList.remove('btn-primary');
        btnGuardarFavorito.classList.add('btn-danger');
        mostrarToast('Receta agregada a favoritos');
    }

    const btnCerrar = document.createElement('BUTTON');
    btnCerrar.classList.add('btn', 'btn-secondary', 'col');
    btnCerrar.textContent = 'Cerrar';
    btnCerrar.onclick = () => {
        modal.hide(); //.hide() es un metodo de la clase Modal de bootstrap
    }

    const modalFooter = document.querySelector('.modal-footer');
    limpiarHtml(modalFooter);
    modalFooter.appendChild(btnGuardarFavorito);
    modalFooter.appendChild(btnCerrar);

    //.show() es un metodo de la clase Modal de boostrap
    modal.show();
}

function guardarFavorito(receta) {
    //consultar los que hay en localstorage
    const favoritosRecetas = JSON.parse(localStorage.getItem('favoritosRecetas')) ?? [];
    //agregar un elemento al local storage
    localStorage.setItem('favoritosRecetas', JSON.stringify([...favoritosRecetas, receta]) );
}

function eliminarFavorito(id) {
    //consultar los que hay en localstorage
    const favoritosRecetas = JSON.parse(localStorage.getItem('favoritosRecetas')) ?? [];
    //filtrar elemento a eliminar
    const favoritosActualizar = favoritosRecetas.filter(receta => receta.id !== id);
    //almacenar el arreglo con los datos actualizados
    localStorage.setItem('favoritosRecetas', JSON.stringify([...favoritosActualizar]) );
    //actualizar las clases del boton 
    const btnGuardarFavorito = document.querySelector('.btn-guardar');
    btnGuardarFavorito.classList.remove('btn-danger');
    btnGuardarFavorito.classList.add('btn-primary');
    btnGuardarFavorito.textContent = 'Agregar a Favoritos';

    mostrarFavoritos();
}

function mostrarToast(mensaje) {
    const toastDiv = document.querySelector('#toast');
    const toastBody = document.querySelector('#toast-body');
    const toast = new bootstrap.Toast('#toast');
    toastBody.textContent = mensaje;
    toast.show();
}

function recetaExisteStorage(id) {
    const favoritosRecetas = JSON.parse(localStorage.getItem('favoritosRecetas')) ?? [];
    return favoritosRecetas.some(receta => receta.id === id);
}

function mostrarFavoritos() {
    const favoritosRecetas = JSON.parse(localStorage.getItem('favoritosRecetas')) ?? [];

    if(favoritosRecetas.length) {
        mostrarRecetas(favoritosRecetas);
        return;
    }

    const noFavoritos = document.createElement('P');
    noFavoritos.classList.add('text-center', 'mt-5', 'font-bold', 'fs-4');
    noFavoritos.textContent = 'No hay favoritos para mostrar';
    resultado.appendChild(noFavoritos);
}

function limpiarHtml(selector) {
    while (selector.firstChild) {
        selector.removeChild(selector.firstChild);
    }
}


document.addEventListener('DOMContentLoaded', iniciarApp);