# Changelog

All notable changes to this project will be documented in this file.

## [0.1.4] - 2025-06-28
### Fixed
- Improved compatibility with Zod and Yup validation schemas.
- Enhanced functionality to support custom validation schemas.  

### Changed
- Refactored the validation logic in the store. Removed the universal approach and implemented distinct logic for each type of validation library. 

## [0.1.3] - 2025-06-27
### Fixed
- `clearFormValues()` now correctly resets only the form data, not the subscriptions.
- Separated the logic of `clearFormValues` and unsubscribe behavior.
- Introduced a new method `unsubscribeFromStore()` to explicitly clear all data and unsubscribe.

### Changed
- Internal refactoring of store cleanup logic for better control and reliability.

## [0.1.2] - 2025-06-26
### Fixed
- Bugs in `"edit"` mode are resolved.
- Validation and form prefill now correctly work in edit mode.

### Added
- Edit mode officially supported and tested.

## [0.1.1] - 2025-06-20
### Added
- Initial `README.md` with setup and usage instructions.

## [0.1.0] - 2025-06-19
### Added
- Initial version of form store.
- Core functionality: `formValues`, `setFormValues`, `errors`, `isValid`, and `subscribe()`.
- Support for custom validation schema and "edit"/"add" mode.

### Note
- Experimental release for internal testing.
