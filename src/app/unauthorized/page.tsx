
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ShieldAlert } from "lucide-react"

export default function UnauthorizedPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                <ShieldAlert className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Access Denied
            </h1>
            <p className="mt-4 text-lg text-gray-500 max-w-md mx-auto">
                The Google account you signed in with is not authorized to access this application.
                Please contact your administrator to request access.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link href="/login">
                    <Button variant="outline">Try a different Google Account</Button>
                </Link>
            </div>
        </div>
    )
}
