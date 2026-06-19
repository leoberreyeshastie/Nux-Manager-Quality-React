import { supabase } from './supabase';

/*
|--------------------------------------------------------------------------
| TIPOS DE CATÁLOGO
|--------------------------------------------------------------------------
*/

export async function getTiposCatalogo() {

    const { data, error } =
        await supabase
            .from('catalogo_tipos')
            .select('*')
            .eq('activo', true)
            .order('nombre');

    if (error) throw error;

    return data;
}

/*
|--------------------------------------------------------------------------
| ITEMS
|--------------------------------------------------------------------------
*/

export async function getItemsCatalogo(codigoTipo) {

    const { data, error } =
        await supabase
            .from('catalogo_items')
            .select(`
                *,
                catalogo_tipos!inner(
                    codigo,
                    nombre
                )
            `)
            .eq(
                'catalogo_tipos.codigo',
                codigoTipo
            )
            .order('orden');

    if (error) throw error;

    return data;
}

export async function createItemCatalogo(item) {

    const { data, error } =
        await supabase
            .from('catalogo_items')
            .insert([item])
            .select()
            .single();

    if (error) throw error;

    return data;
}

export async function updateItemCatalogo(id, values) {

    const { data, error } =
        await supabase
            .from('catalogo_items')
            .update(values)
            .eq('id', id)
            .select()
            .single();

    if (error) throw error;

    return data;
}

export async function deleteItemCatalogo(id) {

    const { error } =
        await supabase
            .from('catalogo_items')
            .update({
                activo: false
            })
            .eq('id', id);

    if (error) throw error;
}