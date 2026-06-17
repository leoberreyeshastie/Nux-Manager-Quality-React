import { supabase }
from './supabase';

export async function getCatalogos() {

    const { data, error } =
        await supabase
            .from('catalogo_tipos')
            .select('*');

    console.log(data);
    console.log(error);

    return data;
}