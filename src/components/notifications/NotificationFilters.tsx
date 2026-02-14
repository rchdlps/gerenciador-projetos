import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { NotificationFilter } from "@/lib/notification-types";

type NotificationFiltersProps = {
    filters: NotificationFilter;
    onFiltersChange: (filters: NotificationFilter) => void;
};

export function NotificationFilters({
    filters,
    onFiltersChange,
}: NotificationFiltersProps) {
    const [date, setDate] = useState<Date | undefined>(filters.startDate);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFiltersChange({ ...filters, search: e.target.value });
    };

    const handleStatusChange = (value: string) => {
        onFiltersChange({ ...filters, status: value as any });
    };

    const handleTypeChange = (value: string) => {
        onFiltersChange({ ...filters, type: value as any });
    };

    const handleDateSelect = (newDate: Date | undefined) => {
        setDate(newDate);
        if (newDate) {
            // Set start date to beginning of day and end date to end of day if implementing single date picker
            // For now, let's treat it as startDate filter
            const start = new Date(newDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(newDate);
            end.setHours(23, 59, 59, 999);
            onFiltersChange({ ...filters, startDate: start, endDate: end });
        } else {
            const { startDate, endDate, ...rest } = filters;
            onFiltersChange(rest);
        }
    };

    const clearFilters = () => {
        setDate(undefined);
        onFiltersChange({
            status: "all",
            type: "all",
            search: "",
        });
    };

    const hasActiveFilters =
        filters.status !== "all" ||
        filters.type !== "all" ||
        filters.search ||
        filters.startDate;

    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between py-4">
            <div className="flex flex-1 items-center space-x-2">
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar notificações..."
                        value={filters.search || ""}
                        onChange={handleSearchChange}
                        className="pl-8"
                    />
                </div>
                <Select
                    value={filters.status || "all"}
                    onValueChange={handleStatusChange}
                >
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Status</SelectItem>
                        <SelectItem value="unread">Não lidas</SelectItem>
                        <SelectItem value="read">Lidas</SelectItem>
                    </SelectContent>
                </Select>
                <Select
                    value={filters.type || "all"}
                    onValueChange={handleTypeChange}
                >
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Tipos</SelectItem>
                        <SelectItem value="activity">Atividade</SelectItem>
                        <SelectItem value="system">Sistema</SelectItem>
                    </SelectContent>
                </Select>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-[180px] justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? (
                                format(date, "PPP", { locale: ptBR })
                            ) : (
                                <span>Filtrar por data</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={handleDateSelect}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>
            {hasActiveFilters && (
                <Button
                    variant="ghost"
                    onClick={clearFilters}
                    className="h-8 px-2 lg:px-3"
                >
                    Limpar filtros
                    <X className="ml-2 h-4 w-4" />
                </Button>
            )}
        </div>
    );
}
