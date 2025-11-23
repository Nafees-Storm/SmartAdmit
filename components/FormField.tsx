import React from 'react'
import {FormControl, FormDescription, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Controller, FieldValues, Path, Control} from "react-hook-form";


interface FormFieldProps<T extends FieldValues> {

    control:Control<T>
    name: Path<T>;
    label: string;
    placeholder?: string;
    type?: 'text' | 'password' | 'email' | 'file'
}


const FormField = <T,>({
                           control,
                           name,
                           label,
                           placeholder,
                           type = 'text',
                       }: FormFieldProps<T>) => (
    <Controller
        name={name}
        control={control}
        render={({ field }) => (
            <FormItem>
                <FormLabel className="Label">{label}</FormLabel>
                <FormControl>
                    <Input className='input' placeholder={placeholder} type={type} {...field} />
                </FormControl>

                <FormMessage />
            </FormItem>
        )}
    />
);
export default FormField