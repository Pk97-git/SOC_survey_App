import React, { useState } from 'react';
import { Platform } from 'react-native';
import { IconButton, Portal, Dialog, useTheme, Button, Text } from 'react-native-paper';
import { Typography } from '../constants/design';

interface HelpIconProps {
    text: string;
    size?: number;
}

export const HelpIcon: React.FC<HelpIconProps> = ({ text, size = 16 }) => {
    const theme = useTheme();
    const [visible, setVisible] = useState(false);

    const showHelp = () => setVisible(true);
    const hideHelp = () => setVisible(false);

    return (
        <>
            <IconButton
                icon="help-circle-outline"
                size={size}
                iconColor={theme.colors.primary}
                onPress={showHelp}
                style={{ margin: 0 }}
            />
            <Portal>
                <Dialog visible={visible} onDismiss={hideHelp}>
                    <Dialog.Title>
                        <Text style={[Typography.h4, { color: theme.colors.onSurface }]}>Help</Text>
                    </Dialog.Title>
                    <Dialog.Content>
                        <Text style={[Typography.bodyMd, { color: theme.colors.onSurface, lineHeight: 22 }]}>
                            {text}
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={hideHelp}>Got it</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </>
    );
};
