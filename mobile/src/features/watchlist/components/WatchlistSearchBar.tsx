import { TextInput, View } from 'react-native';

type WatchlistSearchBarProps = {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
};

export function WatchlistSearchBar({
    value,
    onChangeText,
    placeholder = 'Search ticker...',
}: WatchlistSearchBarProps) {
    return (
        <View className="bg-surface border border-border rounded-sm mb-2">
            <TextInput
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#64748B"
                className="text-typography text-sm leading-5 px-4 py-2.5"
                value={value}
            />
        </View>
    );
}
