import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

type TargetType = "user" | "organization" | "role" | "multi-org" | "all";

type User = {
    id: string;
    name: string;
    email: string;
};

type Organization = {
    id: string;
    name: string;
};

type TargetSelectorProps = {
    targetType: TargetType;
    targetIds: string[];
    onTargetTypeChange: (type: TargetType) => void;
    onTargetIdsChange: (ids: string[]) => void;
    organizationId?: string;
    isSuperAdmin: boolean;
};

export function TargetSelector({
    targetType,
    targetIds,
    onTargetTypeChange,
    onTargetIdsChange,
    organizationId,
    isSuperAdmin,
}: TargetSelectorProps) {
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<User[] | Organization[]>([]);
    const [selectedItems, setSelectedItems] = useState<(User | Organization)[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Search users or organizations
    const handleSearch = async (query: string, type: "user" | "organization") => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const res = await fetch(`/api/admin/notifications/targets?type=${type}&q=${encodeURIComponent(query)}`);
            const data = await res.json();
            setSearchResults(type === "user" ? data.users : data.organizations);
        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setIsSearching(false);
        }
    };

    // Add selected item
    const addItem = (item: User | Organization) => {
        const newSelected = [...selectedItems, item];
        setSelectedItems(newSelected);
        onTargetIdsChange(newSelected.map((i) => i.id));
        setSearchOpen(false);
        setSearchQuery("");
    };

    // Remove selected item
    const removeItem = (id: string) => {
        const newSelected = selectedItems.filter((i) => i.id !== id);
        setSelectedItems(newSelected);
        onTargetIdsChange(newSelected.map((i) => i.id));
    };

    return (
        <div className="space-y-4">
            <Label className="text-base font-semibold">Enviar para</Label>

            <RadioGroup value={targetType} onValueChange={(value) => onTargetTypeChange(value as TargetType)}>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="user" id="target-user" />
                    <Label htmlFor="target-user" className="cursor-pointer font-normal">
                        Usuário específico
                    </Label>
                </div>

                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="organization" id="target-org" />
                    <Label htmlFor="target-org" className="cursor-pointer font-normal">
                        Organização inteira
                    </Label>
                </div>

                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="role" id="target-role" disabled={!organizationId} />
                    <Label htmlFor="target-role" className="cursor-pointer font-normal">
                        Todos os gestores {!organizationId && "(requer contexto org)"}
                    </Label>
                </div>

                {isSuperAdmin && (
                    <>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="multi-org" id="target-multi" />
                            <Label htmlFor="target-multi" className="cursor-pointer font-normal">
                                Múltiplas organizações
                            </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all" id="target-all" />
                            <Label htmlFor="target-all" className="cursor-pointer font-normal">
                                <span className="text-red-600 font-medium">Todos os usuários do sistema</span>
                            </Label>
                        </div>
                    </>
                )}
            </RadioGroup>

            {/* Search/Select UI for user, organization, multi-org */}
            {(targetType === "user" || targetType === "organization" || targetType === "multi-org") && (
                <div className="space-y-2">
                    <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                                <Search className="mr-2 h-4 w-4" />
                                {targetType === "user" ? "Buscar usuário" : "Buscar organização"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                            <Command>
                                <CommandInput
                                    placeholder={targetType === "user" ? "Nome ou email..." : "Nome da organização..."}
                                    value={searchQuery}
                                    onValueChange={(value) => {
                                        setSearchQuery(value);
                                        handleSearch(
                                            value,
                                            targetType === "multi-org" ? "organization" : targetType
                                        );
                                    }}
                                />
                                <CommandList>
                                    {isSearching ? (
                                        <CommandEmpty>Buscando...</CommandEmpty>
                                    ) : searchResults.length === 0 ? (
                                        <CommandEmpty>Nenhum resultado encontrado</CommandEmpty>
                                    ) : (
                                        <CommandGroup>
                                            {searchResults.map((item) => (
                                                <CommandItem
                                                    key={item.id}
                                                    onSelect={() => addItem(item)}
                                                    className="cursor-pointer"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{item.name}</span>
                                                        {"email" in item && (
                                                            <span className="text-xs text-muted-foreground">
                                                                {item.email}
                                                            </span>
                                                        )}
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    )}
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    {/* Selected items */}
                    {selectedItems.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {selectedItems.map((item) => (
                                <Badge key={item.id} variant="secondary" className="gap-1">
                                    {item.name}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-4 w-4 p-0 hover:bg-transparent"
                                        onClick={() => removeItem(item.id)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Target count display */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">
                    {targetType === "all"
                        ? "⚠️ Todos os usuários serão notificados"
                        : targetType === "role"
                            ? `Todos os gestores da organização serão notificados`
                            : selectedItems.length > 0
                                ? `${selectedItems.length} ${targetType === "user" ? "usuário(s)" : "organização(ões)"} selecionado(s)`
                                : "Nenhum alvo selecionado"}
                </span>
            </div>
        </div>
    );
}
