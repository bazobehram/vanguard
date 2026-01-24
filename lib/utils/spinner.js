import ora from 'ora';

export function createSpinner(text) {
    return ora({
        text: text,
        color: 'yellow',
        spinner: 'dots',
    });
}
