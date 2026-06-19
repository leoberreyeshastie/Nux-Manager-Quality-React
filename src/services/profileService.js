import { supabase } from './supabase';

export async function getCurrentProfile() {

    const {
        data: { user }
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } =
        await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

    if (error) {
        console.error(error);
        return null;
    }

    return data;
}