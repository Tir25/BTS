/**
 * AddressSearch Component
 * Autocomplete search for addresses using Nominatim geocoding
 * Features: debounced search, keyboard navigation, multiple results
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { searchAddress, debounce } from '@/services/geocoding';
import { Search, Loader2, MapPin } from 'lucide-react';
import './AddressSearch.css';

export function AddressSearch({
    onSelect,
    placeholder = 'Search address...',
    className = ''
}) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const inputRef = useRef(null);
    const listRef = useRef(null);

    // Debounced search function
    const debouncedSearch = useCallback(
        debounce(async (searchQuery) => {
            if (searchQuery.length < 2) {
                setResults([]);
                setIsOpen(false);
                return;
            }

            setIsLoading(true);
            try {
                const data = await searchAddress(searchQuery);
                setResults(data);
                setIsOpen(data.length > 0);
                setSelectedIndex(-1);
            } catch (error) {
                console.error('Search error:', error);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 300),
        []
    );

    // Handle input change
    const handleChange = (e) => {
        const value = e.target.value;
        setQuery(value);
        debouncedSearch(value);
    };

    // Handle result selection
    const handleSelect = (result) => {
        setQuery(result.name);
        setIsOpen(false);
        setResults([]);
        onSelect?.(result);
    };

    // Handle keyboard navigation
    const handleKeyDown = (e) => {
        if (!isOpen || results.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < results.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev > 0 ? prev - 1 : results.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && results[selectedIndex]) {
                    handleSelect(results[selectedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setSelectedIndex(-1);
                break;
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (inputRef.current && !inputRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Clear search
    const handleClear = () => {
        setQuery('');
        setResults([]);
        setIsOpen(false);
        inputRef.current?.focus();
    };

    return (
        <div className={`address-search ${className}`} ref={inputRef}>
            <div className="address-search-input-wrapper">
                <span className="address-search-icon"><Search size={16} /></span>
                <input
                    type="text"
                    value={query}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => results.length > 0 && setIsOpen(true)}
                    placeholder={placeholder}
                    className="address-search-input"
                    autoComplete="off"
                />
                {isLoading && <span className="address-search-spinner"><Loader2 size={16} className="animate-spin" /></span>}
                {query && !isLoading && (
                    <button
                        type="button"
                        className="address-search-clear"
                        onClick={handleClear}
                    >
                        ×
                    </button>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <ul className="address-search-results" ref={listRef}>
                    {results.map((result, index) => (
                        <li
                            key={result.id}
                            className={`address-search-item ${index === selectedIndex ? 'selected' : ''
                                }`}
                            onClick={() => handleSelect(result)}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            <span className="address-search-item-icon"><MapPin size={16} /></span>
                            <div className="address-search-item-content">
                                <span className="address-search-item-name">
                                    {result.name}
                                </span>
                                <span className="address-search-item-address">
                                    {result.address || result.displayName}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default AddressSearch;
