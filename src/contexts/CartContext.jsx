import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const CartContext = createContext(null)

const initialState = {
  items: [],
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find((item) => item.id === action.payload.id)
      if (existing) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        }
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
      }
    }
    case 'REMOVE_ONE': {
      const existing = state.items.find((item) => item.id === action.payload.id)
      if (!existing) return state
      if (existing.quantity === 1) {
        return {
          ...state,
          items: state.items.filter((item) => item.id !== action.payload.id),
        }
      }
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity - 1 }
            : item
        ),
      }
    }
    case 'REMOVE_ALL_OF_ITEM':
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload.id),
      }
    case 'CLEAR':
      return initialState
    case 'LOAD_CART':
      return {
        ...state,
        items: action.payload.items || [],
      }
    default:
      return state
  }
}

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  // Load cart from AsyncStorage on mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const saved = await AsyncStorage.getItem('cart')
        if (saved) {
          const parsed = JSON.parse(saved)
          dispatch({ type: 'LOAD_CART', payload: parsed })
        }
      } catch (error) {
        console.error('Error loading cart:', error)
      }
    }
    loadCart()
  }, [])

  // Save cart to AsyncStorage whenever it changes
  useEffect(() => {
    const saveCart = async () => {
      try {
        // Chỉ lưu nếu có items, nếu không thì xóa
        if (state.items.length > 0) {
          await AsyncStorage.setItem('cart', JSON.stringify(state))
        } else {
          // Nếu không có items, xóa cart khỏi AsyncStorage
          await AsyncStorage.removeItem('cart')
        }
      } catch (error) {
        console.error('Error saving cart:', error)
      }
    }
    saveCart()
  }, [state])

  // Clear cart when user logs out
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('token')
        if (!token && state.items.length > 0) {
          dispatch({ type: 'CLEAR' })
        }
      } catch (error) {
        console.error('Error checking auth status:', error)
      }
    }
    
    const interval = setInterval(checkAuthStatus, 1000)
    return () => clearInterval(interval)
  }, [state.items.length])

  const addToCart = (product) => {
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        id: product.id,
        name: product.name,
        price: product.numericPrice ?? product.priceValue ?? 0,
        displayPrice: product.price,
      },
    })
  }

  const removeOne = (id) =>
    dispatch({ type: 'REMOVE_ONE', payload: { id } })

  const removeItemCompletely = (id) =>
    dispatch({ type: 'REMOVE_ALL_OF_ITEM', payload: { id } })

  const clearCart = async () => {
    try {
      console.log('clearCart called, current items count:', state.items.length)
      // Xóa cart khỏi AsyncStorage
      await AsyncStorage.removeItem('cart')
      console.log('AsyncStorage cart removed')
      // Reset state về initialState
      dispatch({ type: 'CLEAR' })
      console.log('Cart cleared successfully, state reset to:', initialState)
    } catch (error) {
      console.error('Error clearing cart:', error)
      // Vẫn dispatch CLEAR dù có lỗi với AsyncStorage
      dispatch({ type: 'CLEAR' })
    }
  }

  const totalPrice = useMemo(
    () =>
      state.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      ),
    [state.items]
  )

  const totalCount = useMemo(
    () =>
      state.items.reduce((sum, item) => sum + item.quantity, 0),
    [state.items]
  )

  const value = {
    items: state.items,
    addToCart,
    removeOne,
    removeItemCompletely,
    clearCart,
    totalPrice,
    totalCount,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used inside CartProvider')
  }
  return ctx
}

