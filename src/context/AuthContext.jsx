import {
    createContext,
    useContext,
    useEffect,
    useState
} from 'react';

import { supabase } from '../services/supabase';

import { getCurrentProfile } from '../services/profileService';

const AuthContext = createContext();

export function AuthProvider({ children }) {

    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const loadProfile = async (currentUser) => {

        if (!currentUser) {
            setProfile(null);
            return;
        }
        const profileData = await getCurrentProfile();
        setProfile(profileData);
    };

    useEffect(() => {   

        supabase.auth.getSession()
            .then(async ({ data }) => {

                const currentUser =
                    data.session?.user ?? null;

                setUser(currentUser);

                await loadProfile(currentUser);

                setLoading(false);
            });

        const {
            data: listener
        } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                const currentUser =
                    session?.user ?? null;
                setUser(currentUser);
                await loadProfile(currentUser);
                }
        );

        return () => {
            listener.subscription.unsubscribe();
        };

    }, []);

    const login = async (email, password) => {

        const { error } =
            await supabase.auth.signInWithPassword({
                email,
                password
            });

        if (error) throw error;
    };

    const logout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                loading,
                login,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () =>
    useContext(AuthContext);