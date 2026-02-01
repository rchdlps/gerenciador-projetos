import { Providers } from "@/components/providers";
import SignIn from "./sign-in";
import SignUp from "./sign-up";

export function SignInPage() {
    return (
        <Providers>
            <SignIn />
        </Providers>
    )
}

export function SignUpPage() {
    return (
        <Providers>
            <SignUp />
        </Providers>
    )
}
