import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Meal } from "../types/meal";
import "./NewMeal.css";

export default function NewMeal() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [formData, setFormData] = useState<Partial<Meal>>({
    name: "",
    description: "",
    ingredients: [],
    instructions: [],
    prepTime: undefined,
    cookTime: undefined,
    servings: undefined,
    tags: [],
    mealTime: "snack",
  });

  const [ingredientInput, setIngredientInput] = useState("");
  const [instructionInput, setInstructionInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditing && id) {
      loadMeal();
    }
  }, [id, isEditing]);

  async function loadMeal() {
    if (!id) return;
    setLoading(true);
    try {
      const meals = await window.electronAPI.getMeals();
      const meal = meals.find((m) => m.id === id);
      if (meal) {
        setFormData(meal);
      }
    } catch (error) {
      console.error("Error loading meal:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (field: keyof Meal, value: any) => {
    console.log(value)
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addIngredient = () => {
    if (ingredientInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        ingredients: [...(prev.ingredients || []), ingredientInput.trim()],
      }));
      setIngredientInput("");
    }
  };

  const removeIngredient = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients?.filter((_, i) => i !== index) || [],
    }));
  };

  const addInstruction = () => {
    if (instructionInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        instructions: [...(prev.instructions || []), instructionInput.trim()],
      }));
      setInstructionInput("");
    }
  };

  const removeInstruction = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      instructions: prev.instructions?.filter((_, i) => i !== index) || [],
    }));
  };

  const addTag = () => {
    if (tagInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const removeTag = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((_, i) => i !== index) || [],
    }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Meal name is required';
    }
    
    if (formData.ingredients && formData.ingredients.length === 0) {
      errors.ingredients = 'At least one ingredient is required';
    }
    
    if (formData.instructions && formData.instructions.length === 0) {
      errors.instructions = 'At least one instruction is required';
    }

    if (formData.prepTime !== undefined && formData.prepTime < 0) {
      errors.prepTime = 'Prep time cannot be negative';
    }

    if (formData.cookTime !== undefined && formData.cookTime < 0) {
      errors.cookTime = 'Cook time cannot be negative';
    }

    if (formData.servings !== undefined && formData.servings < 1) {
      errors.servings = 'Servings must be at least 1';
    }

    // if (formData.mealTime !== undefined) {
    //   errors.servings = 'Must choose meal time';
    // }


    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});
    if (!validateForm()) {
      setError('Please fix the validation errors below');
      return;
    }

    setLoading(true);
    try {
      const meal: Meal = {
        id: formData.id || Date.now().toString(),
        name: formData.name?.trim() || "",
        description: formData.description?.trim() || "",
        ingredients: formData.ingredients || [],
        instructions: formData.instructions || [],
        prepTime: formData.prepTime,
        cookTime: formData.cookTime,
        servings: formData.servings,
        tags: formData.tags || [],
        mealTime: formData.mealTime || "dinner",
      };
      console.log(meal.mealTime)
      const result = await window.electronAPI.saveMeal(meal);
      if (result.success && result.meal) {
        navigate(`/meals/${result.meal.id}`);
      } else {
        const errorMessage = result.error || 'Failed to save meal. Please try again.';
        setError(errorMessage);
        console.error('Save meal error:', result.error);
      }
    } catch (error: any) {
      console.error("Error saving meal:", error);
      const errorMessage = error?.message || 'An unexpected error occurred. Please check the console for details.';
      setError(`Failed to save meal: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return <div className="new-meal">Loading...</div>;
  }

  return (
    <div className="new-meal">
      <div className="new-meal-header">
        <button className="back-button" onClick={() => navigate("/meals")}>
          ← Back
        </button>
        <h1>{isEditing ? "Edit Meal" : "New Meal"}</h1>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="meal-form">
        <div className="form-group">
          <label htmlFor="name">Meal Name *</label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => {
              handleInputChange("name", e.target.value);
              if (validationErrors.name) {
                setValidationErrors(prev => {
                  const newErrors = { ...prev };
                  delete newErrors.name;
                  return newErrors;
                });
              }
            }}
            required
            className={validationErrors.name ? 'error-input' : ''}
          />
          {validationErrors.name && (
            <span className="field-error">{validationErrors.name}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            rows={3}
          />
        </div>

         <div className="meal-type-toggle">
            {(["breakfast", "lunch", "dinner", "dessert"] as const).map(type => (
              <button
                type="button"
                key={type}
                className={formData.mealTime === type ? "active" : ""}
                onClick={() => handleInputChange("mealTime", type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>


        {/* <div className="form-row">
          <div className="form-group">
            <label htmlFor="prepTime">Prep Time (minutes)</label>
            <input
              type="number"
              id="prepTime"
              value={formData.prepTime || ""}
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value) : undefined;
                handleInputChange("prepTime", value);
                if (validationErrors.prepTime) {
                  setValidationErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.prepTime;
                    return newErrors;
                  });
                }
              }}
              min="0"
              className={validationErrors.prepTime ? 'error-input' : ''}
            />
            {validationErrors.prepTime && (
              <span className="field-error">{validationErrors.prepTime}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="cookTime">Cook Time (minutes)</label>
            <input
              type="number"
              id="cookTime"
              value={formData.cookTime || ""}
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value) : undefined;
                handleInputChange("cookTime", value);
                if (validationErrors.cookTime) {
                  setValidationErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.cookTime;
                    return newErrors;
                  });
                }
              }}
              min="0"
              className={validationErrors.cookTime ? 'error-input' : ''}
            />
            {validationErrors.cookTime && (
              <span className="field-error">{validationErrors.cookTime}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="servings">Servings</label>
            <input
              type="number"
              id="servings"
              value={formData.servings || ""}
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value) : undefined;
                handleInputChange("servings", value);
                if (validationErrors.servings) {
                  setValidationErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.servings;
                    return newErrors;
                  });
                }
              }}
              min="1"
              className={validationErrors.servings ? 'error-input' : ''}
            />
            {validationErrors.servings && (
              <span className="field-error">{validationErrors.servings}</span>
            )}
          </div>
        </div> */}

        <div className="form-group">
          <label>Ingredients *</label>
          <div className="input-with-button">
            <input
              type="text"
              value={ingredientInput}
              onChange={(e) => setIngredientInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addIngredient();
                  if (validationErrors.ingredients) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.ingredients;
                      return newErrors;
                    });
                  }
                }
              }}
              placeholder="Add an ingredient"
            />
            <button type="button" onClick={() => {
              addIngredient();
              if (validationErrors.ingredients) {
                setValidationErrors(prev => {
                  const newErrors = { ...prev };
                  delete newErrors.ingredients;
                  return newErrors;
                });
              }
            }}>
              Add
            </button>
          </div>
          {validationErrors.ingredients && (
            <span className="field-error">{validationErrors.ingredients}</span>
          )}
          <div className="list-items">
            {formData.ingredients?.map((ingredient, index) => (
              <div key={index} className="list-item">
                <span>{ingredient}</span>
                <button
                  type="button"
                  onClick={() => {
                    removeIngredient(index);
                    if (validationErrors.ingredients && (formData.ingredients?.length || 0) <= 1) {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.ingredients;
                        return newErrors;
                      });
                    }
                  }}
                  className="remove-button"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Instructions *</label>
          <div className="input-with-button">
            <textarea
              value={instructionInput}
              onChange={(e) => setInstructionInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  addInstruction();
                  if (validationErrors.instructions) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.instructions;
                      return newErrors;
                    });
                  }
                }
              }}
              placeholder="Add a step"
              rows={2}
            />
            <button type="button" onClick={() => {
              addInstruction();
              if (validationErrors.instructions) {
                setValidationErrors(prev => {
                  const newErrors = { ...prev };
                  delete newErrors.instructions;
                  return newErrors;
                });
              }
            }}>
              Add
            </button>
          </div>
          {validationErrors.instructions && (
            <span className="field-error">{validationErrors.instructions}</span>
          )}
          <div className="list-items">
            {formData.instructions?.map((instruction, index) => (
              <div key={index} className="list-item">
                <span>{index + 1}. {instruction}</span>
                <button
                  type="button"
                  onClick={() => {
                    removeInstruction(index);
                    if (validationErrors.instructions && (formData.instructions?.length || 0) <= 1) {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.instructions;
                        return newErrors;
                      });
                    }
                  }}
                  className="remove-button"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Tags</label>
          <div className="input-with-button">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add a tag"
            />
            <button type="button" onClick={addTag}>
              Add
            </button>
          </div>
          <div className="list-items">
            {formData.tags?.map((tag, index) => (
              <div key={index} className="list-item tag-item">
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="remove-button"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate("/meals")}
            className="cancel-button"
          >
            Cancel
          </button>
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? "Saving..." : isEditing ? "Update Meal" : "Save Meal"}
          </button>
        </div>
      </form>
    </div>
  );
}

