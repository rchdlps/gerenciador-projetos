import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, ArrowRight, Folder } from "lucide-react"

type Project = {
    id: string
    name: string
    description: string | null
    updatedAt: string
}


export function ProjectList() {
    const queryClient = useQueryClient()
    const [isOpen, setIsOpen] = useState(false)
    const [name, setName] = useState("")
    const [desc, setDesc] = useState("")

    const { data: projects, isLoading } = useQuery<Project[]>({
        queryKey: ['projects'],
        queryFn: async () => {
            const res = await api.projects.$get()
            if (!res.ok) throw new Error("Failed to fetch")
            return res.json()
        }
    })

    const createProject = useMutation({
        mutationFn: async () => {
            const res = await api.projects.$post({
                json: { name, description: desc }
            })
            if (!res.ok) throw new Error("Failed to create")
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] })
            setIsOpen(false)
            setName("")
            setDesc("")
        }
    })

    if (isLoading) return <div className="p-10 text-center">Loading projects...</div>

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Projects</h2>
                    <p className="text-muted-foreground mt-1">Manage and track your ongoing projects</p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                            <Plus className="mr-2 h-4 w-4" /> New Project
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Create New Project</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Project Name</Label>
                                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Office Renovation" className="col-span-3" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="desc">Description</Label>
                                <Textarea id="desc" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Brief description of the scope..." className="col-span-3" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button onClick={() => createProject.mutate()} disabled={createProject.isPending}>
                                {createProject.isPending ? 'Creating...' : 'Create Project'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {projects?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-xl bg-muted/30">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Folder className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
                    <p className="text-muted-foreground max-w-sm mb-6">
                        Get started by creating your first project to organize tasks and manage stakeholders.
                    </p>
                    <Button onClick={() => setIsOpen(true)}>Create First Project</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {projects?.map(project => (
                        <Card key={project.id} className="group relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 border-border/50 bg-card">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-1">
                                    {project.name}
                                </CardTitle>
                                <CardDescription className="line-clamp-2 text-sm">
                                    {project.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-2">
                                <div className="flex items-center text-xs text-muted-foreground gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                                    Active
                                    <span className="mx-2">•</span>
                                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4">
                                <Button asChild variant="secondary" className="w-full text-xs font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <a href={`/projects/${project.id}`}>
                                        View Details <ArrowRight className="ml-2 h-3 w-3" />
                                    </a>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
