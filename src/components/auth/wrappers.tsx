import { Providers } from "@/components/providers";
import SignIn from "./sign-in";
import SignUp from "./sign-up";
import { AuthLayout } from "@/components/layout/auth-layout";

export function SignInPage() {
    return (
        <Providers>
            <AuthLayout title="Login">
                <SignIn />
            </AuthLayout>
        </Providers>
    )
}

export function SignUpPage() {
    return (
        <Providers>
            <AuthLayout title="Cadastro">
                <SignUp />
            </AuthLayout>
        </Providers>
    )
}
