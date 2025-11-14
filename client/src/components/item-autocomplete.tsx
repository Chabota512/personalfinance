import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { MapPin, TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/financial-utils";

interface Item {
  id: string;
  name: string;
  category: string;
  averagePrice?: string;
  bestPrice?: string;
  bestLocation?: string;
}

interface ItemAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectItem?: (item: Item) => void;
  placeholder?: string;
  className?: string;
}

export function ItemAutocomplete({
  value,
  onChange,
  onSelectItem,
  placeholder = "Start typing item name...",
  className,
}: ItemAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const filteredItems = items
    .filter((item) => item.name.toLowerCase().includes(value.toLowerCase()))
    .slice(0, 5);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsOpen(value.length > 0 && filteredItems.length > 0);
    setSelectedIndex(0);
  }, [value, filteredItems.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredItems.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelectItem(filteredItems[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const handleSelectItem = (item: Item) => {
    onChange(item.name);
    setIsOpen(false);
    if (onSelectItem) {
      onSelectItem(item);
    }
  };

  const getPriceTrend = (item: Item) => {
    if (!item.averagePrice || !item.bestPrice) return null;
    const avg = parseFloat(item.averagePrice);
    const best = parseFloat(item.bestPrice);
    const savings = avg - best;
    if (savings > 0.5) {
      return { type: "down", amount: savings };
    }
    return null;
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => value.length > 0 && filteredItems.length > 0 && setIsOpen(true)}
        placeholder={placeholder}
        className={className}
        data-testid="input-item-autocomplete"
        autoComplete="off"
      />

      {isOpen && (
        <Card className="absolute z-50 w-full mt-1 max-h-[300px] overflow-auto shadow-lg">
          <div className="divide-y">
            {filteredItems.map((item, index) => {
              const trend = getPriceTrend(item);
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className={`w-full text-left p-3 hover-elevate transition-colors ${
                    index === selectedIndex ? "bg-accent" : ""
                  }`}
                  data-testid={`autocomplete-item-${index}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.category}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      {item.averagePrice && (
                        <p className="text-sm font-medium">
                          {formatCurrency(parseFloat(item.averagePrice))}
                        </p>
                      )}
                      {trend && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <TrendingDown className="h-3 w-3" />
                          Save {formatCurrency(trend.amount)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {item.bestLocation && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{item.bestLocation}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
