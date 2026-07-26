import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';

// Use these typed hooks throughout the app instead of plain useDispatch / useSelector
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T>(selector: (state: RootState) => T) =>
  useSelector<RootState, T>(selector);
